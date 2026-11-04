import { prisma } from '@bookstudio/database';
import { Prisma } from '@prisma/client';
import { activeUser, accessToBook } from '@/lib/auth';
import { errorResponse, isSameOrigin } from '@/lib/security';
import { manifestHash, parseSnapshotManifest } from '@/lib/snapshots';

export const dynamic = 'force-dynamic';
type Ctx={params:Promise<{bookId:string,snapshotId:string}>};

export async function POST(req:Request,{params}:Ctx) {
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,snapshotId}=await params;
  const book=await accessToBook(bookId,user.id,true);
  if(!book)return errorResponse('NOT_FOUND',404);
  const body=await req.json().catch(()=>null);
  if(body?.confirm!=='RESTORE' || !body.expectedRevisions ||
      typeof body.expectedRevisions!=='object' || Array.isArray(body.expectedRevisions)) {
    return errorResponse('RESTORE_CONFIRMATION_REQUIRED');
  }
  try {
    const result=await prisma.$transaction(async tx=>{
      // Repeat authorisation inside the transaction to prevent a revoked member from restoring.
      const membership=await tx.membership.findFirst({
        where:{userId:user.id,workspaceId:book.workspaceId,role:{in:['OWNER','EDITOR']}},
        select:{id:true}
      });
      const currentBook=await tx.book.findFirst({
        where:{id:bookId,workspaceId:book.workspaceId,archivedAt:null},select:{id:true}
      });
      if(!membership||!currentBook)throw new Error('NOT_FOUND');

      const snapshot=await tx.bookSnapshot.findFirst({
        where:{id:snapshotId,bookId},select:{revisionManifest:true,contentHash:true}
      });
      if(!snapshot)throw new Error('NOT_FOUND');
      const manifest=parseSnapshotManifest(snapshot.revisionManifest);
      if(manifestHash(manifest)!==snapshot.contentHash)throw new Error('SNAPSHOT_CORRUPT');
      const edition=await tx.edition.findFirst({
        where:{bookId},orderBy:{number:'desc'},
        include:{manuscript:{include:{chapters:true}}}
      });
      if(edition?.id!==manifest.editionId)throw new Error('SNAPSHOT_EDITION_CHANGED');
      const chapters=edition.manuscript?.chapters??[];
      const chaptersById=new Map(chapters.map(c=>[c.id,c]));
      const sources=await tx.documentRevision.findMany({
        where:{OR:manifest.chapters.map(c=>({chapterId:c.chapterId,sequence:c.revisionSeq}))}
      });
      const sourceById=new Map(sources.map(s=>[s.chapterId+':'+s.sequence,s]));
      let restored=0;
      for(const item of manifest.chapters){
        const chapter=chaptersById.get(item.chapterId);
        if(!chapter)throw new Error('CHAPTER_MISSING');
        if(chapter.deletedAt)throw new Error('CHAPTER_DELETED');
        if(!Number.isSafeInteger(body.expectedRevisions[item.chapterId]) ||
            body.expectedRevisions[item.chapterId]!==chapter.revisionSeq)throw new Error('REVISION_CONFLICT');
        const source=sourceById.get(item.chapterId+':'+item.revisionSeq);
        if(!source||source.contentHash!==item.contentHash)throw new Error('SNAPSHOT_CORRUPT');
        // Restoration is append-only. Preserve historical chapters and revisions.
        if(chapter.revisionSeq===source.sequence)continue;
        const modified=await tx.chapter.updateMany({
          where:{id:chapter.id,revisionSeq:chapter.revisionSeq},
          data:{revisionSeq:{increment:1}}
        });
        if(modified.count!==1)throw new Error('REVISION_CONFLICT');
        await tx.documentRevision.create({
          data:{chapterId:chapter.id,sequence:chapter.revisionSeq+1,
            content:source.content as Prisma.InputJsonValue,
            text:source.text,contentHash:source.contentHash,authorId:user.id}
        });
        restored++;
      }
      if(restored>0)await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
      await tx.auditEvent.create({
        data:{actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
          action:'BOOK_SNAPSHOT_RESTORED',metadata:{snapshotId,restored}}
      });
      return {restored,remainingNewerChapters:chapters.length-manifest.chapters.length};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
  }catch(err){
    const reason=err instanceof Error?err.message:'RESTORE_FAILED';
    if(reason==='NOT_FOUND')return errorResponse(reason,404);
    if(['SNAPSHOT_CORRUPT','SNAPSHOT_EDITION_CHANGED','CHAPTER_MISSING','CHAPTER_DELETED','REVISION_CONFLICT'].includes(reason) ||
        (err as {code?:string})?.code==='P2034')return errorResponse(reason==='RESTORE_FAILED'?'REVISION_CONFLICT':reason,409);
    if(reason==='SNAPSHOT_INVALID'||reason==='SNAPSHOT_DUPLICATE_CHAPTER')return errorResponse(reason,422);
    return errorResponse('RESTORE_FAILED',503);
  }
}
