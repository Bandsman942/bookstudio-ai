import { prisma } from '@bookstudio/database';
import { Prisma } from '@prisma/client';
import { activeUser, accessToBook } from '@/lib/auth';
import { errorResponse, isSameOrigin } from '@/lib/security';
import { manifestHash, type SnapshotManifest } from '@/lib/snapshots';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ bookId: string }> };

export async function GET(_req: Request, {params}: Ctx) {
  const user = await activeUser();
  if (!user) return errorResponse('UNAUTHENTICATED',401);
  const {bookId} = await params;
  if (!await accessToBook(bookId,user.id)) return errorResponse('NOT_FOUND',404);
  const versions = await prisma.bookSnapshot.findMany({
    where:{bookId},
    orderBy:{createdAt:'desc'},
    take:100,
    select:{id:true,name:true,createdAt:true,contentHash:true,revisionManifest:true}
  });
  const editionIds=versions.flatMap(v=> {
    const raw=v.revisionManifest as {editionId?:unknown};
    return typeof raw?.editionId==='string'?[raw.editionId]:[];
  });
  const editions=editionIds.length?await prisma.edition.findMany({
    where:{bookId,id:{in:editionIds}},select:{id:true,number:true}
  }):[];
  const numberById=new Map(editions.map(e=>[e.id,e.number]));
  // Never expose manuscript contents through the versions listing.
  return Response.json({snapshots:versions.map(v=>({
    id:v.id,name:v.name,createdAt:v.createdAt,
    editionNumber:numberById.get((v.revisionManifest as {editionId?:string})?.editionId??'')??null,
    chapterCount:Array.isArray((v.revisionManifest as any)?.chapters) ? (v.revisionManifest as any).chapters.length : 0,
    integrityHash:v.contentHash,
  }))}, {headers:{'Cache-Control':'no-store'}});
}

export async function POST(req: Request, {params}: Ctx) {
  if (!isSameOrigin(req)) return errorResponse('ORIGIN_FORBIDDEN',403);
  const user = await activeUser();
  if (!user) return errorResponse('UNAUTHENTICATED',401);
  const {bookId} = await params;
  const book = await accessToBook(bookId,user.id,true);
  if (!book) return errorResponse('NOT_FOUND',404);
  const body = await req.json().catch(()=>null);
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g,' ') : '';
  if (name.length < 2 || name.length > 140) return errorResponse('SNAPSHOT_NAME_INVALID');

  try {
    const result = await prisma.$transaction(async tx=>{
      const allowed = await tx.membership.findFirst({
        where:{userId:user.id,workspaceId:book.workspaceId,role:{in:['OWNER','EDITOR']}},
        select:{id:true}
      });
      const currentBook = await tx.book.findFirst({
        where:{id:bookId,workspaceId:book.workspaceId,archivedAt:null},
        select:{id:true}
      });
      if (!allowed || !currentBook) throw new Error('NOT_FOUND');
      const count = await tx.bookSnapshot.count({where:{bookId}});
      if (count >= 100) throw new Error('SNAPSHOT_LIMIT_REACHED');

      const edition = await tx.edition.findFirst({
        where:{bookId},orderBy:{number:'desc'},
        include:{manuscript:{include:{
          parts:{orderBy:[{createdAt:'asc'},{id:'asc'}]},
          chapters:{where:{deletedAt:null},orderBy:{position:'asc'}}
        }}}
      });
      const chapters = edition?.manuscript?.chapters ?? [];
      if (!edition || !chapters.length || chapters.length > 500) throw new Error('CHAPTER_COUNT_INVALID');
      const parts=edition.manuscript?.parts??[];
      if(parts.length>500)throw new Error('SNAPSHOT_PART_LIMIT');
      const revisions = await tx.documentRevision.findMany({
        where:{OR:chapters.map(c=>({chapterId:c.id,sequence:c.revisionSeq}))},
        select:{chapterId:true,sequence:true,contentHash:true}
      });
      if (revisions.length !== chapters.length) throw new Error('REVISION_MISSING');
      const hashes = new Map(revisions.map(r=>[r.chapterId+':'+r.sequence,r.contentHash]));
      const manifest: SnapshotManifest = {
        schema:'bookstudio.snapshot.v2',editionId:edition.id,
        parts:parts.map(part=>({id:part.id,title:part.title})),
        chapters: chapters.map(c=>({
          chapterId:c.id,title:c.title,position:c.position,partId:c.partId,
          revisionSeq:c.revisionSeq,
          contentHash:hashes.get(c.id+':'+c.revisionSeq) ?? ''
        }))
      };
      if (manifest.chapters.some(c=>c.contentHash.length!==64)) throw new Error('REVISION_MISSING');
      const created=await tx.bookSnapshot.create({
        data:{bookId,name,revisionManifest:manifest as unknown as Prisma.InputJsonValue,
          contentHash:manifestHash(manifest),authorId:user.id}
      });
      await tx.auditEvent.create({
        data:{actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
          action:'BOOK_SNAPSHOT_CREATED',metadata:{snapshotId:created.id}}
      });
      return {id:created.id,name:created.name,createdAt:created.createdAt,chapterCount:chapters.length};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    return Response.json({snapshot:result},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch(err) {
    const reason=err instanceof Error?err.message:'SNAPSHOT_FAILED';
    if(reason==='NOT_FOUND') return errorResponse(reason,404);
    if(reason==='SNAPSHOT_LIMIT_REACHED' || reason==='REVISION_MISSING') return errorResponse(reason,409);
    if(reason==='SNAPSHOT_PART_LIMIT')return errorResponse(reason,422);
    if((err as {code?:string})?.code==='P2034') return errorResponse('REVISION_CONFLICT',409);
    return errorResponse('SNAPSHOT_FAILED',503);
  }
}
