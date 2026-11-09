import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {randomUUID} from 'node:crypto';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {manifestHash,parseSnapshotManifest} from '@/lib/snapshots';
import {planSnapshotFork,type SnapshotRevisionSource,
  SNAPSHOT_FORK_MAX_CHAPTERS,SNAPSHOT_FORK_MAX_BYTES} from '@/lib/snapshot-fork';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;snapshotId:string}>};
const headers={'Cache-Control':'private, no-store'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A destructive in-place rollback is never performed. Historical snapshot
 * revisions are copied into NEW chapter IDs in a NEW current edition.
 * Transaction and book preconditions forbid partial/double restorations. */
export async function POST(req:Request,{params}:Ctx){
 if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
 const user=await activeUser();
 if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,snapshotId}=await params;
 if(!uuid.test(bookId)||!uuid.test(snapshotId))
   return errorResponse('SNAPSHOT_REQUEST_INVALID',400);
 if(Number(req.headers.get('content-length')||0)>2048)
   return errorResponse('SNAPSHOT_REQUEST_INVALID',413);
 const input=await req.json().catch(()=>null);
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).sort().join(',')!=='confirm,expectedEditionId,expectedUpdatedAt'||
    input.confirm!=='RESTORE_SNAPSHOT_AS_NEW_EDITION'||
    typeof input.expectedEditionId!=='string'||!uuid.test(input.expectedEditionId)||
    typeof input.expectedUpdatedAt!=='string')
   return errorResponse('SNAPSHOT_REQUEST_INVALID',400);
 const expected=new Date(input.expectedUpdatedAt);
 if(!Number.isFinite(expected.getTime())||
    expected.toISOString()!==input.expectedUpdatedAt)
   return errorResponse('SNAPSHOT_REQUEST_INVALID',400);
 try{
   const result=await prisma.$transaction(async tx=>{
     // Access and preconditions are rechecked INSIDE the transaction.
     const book=await tx.book.findFirst({
       where:{id:bookId,archivedAt:null,
         workspace:{memberships:{some:{userId:user.id,role:{in:['OWNER','EDITOR']}}}}},
       select:{id:true,workspaceId:true,updatedAt:true,
         editions:{orderBy:{number:'desc'},take:1,select:{id:true,number:true}}}
     });
     if(!book)return {kind:'NOT_FOUND'} as const;
     const current=book.editions[0];
     if(!current)return {kind:'SNAPSHOT_CORRUPT'} as const;
     if(book.updatedAt.getTime()!==expected.getTime()||
        current.id!==input.expectedEditionId)
       return {kind:'EDITION_CONFLICT'} as const;
     if(current.number>=10000)return {kind:'SNAPSHOT_COPY_TOO_LARGE'} as const;
     const snapshot=await tx.bookSnapshot.findFirst({
       where:{id:snapshotId,bookId},
       select:{id:true,revisionManifest:true,contentHash:true}
     });
     if(!snapshot)return {kind:'NOT_FOUND'} as const;
     const manifest=parseSnapshotManifest(snapshot.revisionManifest);
     if(manifestHash(manifest)!==snapshot.contentHash)
       return {kind:'SNAPSHOT_CORRUPT'} as const;
     if(manifest.chapters.length>SNAPSHOT_FORK_MAX_CHAPTERS)
       return {kind:'SNAPSHOT_COPY_TOO_LARGE'} as const;
     const source=await tx.edition.findFirst({
       where:{id:manifest.editionId,bookId},
       select:{id:true,language:true,manuscript:{select:{id:true}}}
     });
     if(!source?.manuscript)return {kind:'SNAPSHOT_CORRUPT'} as const;
     const revisions=await tx.documentRevision.findMany({
       where:{OR:manifest.chapters.map(item=>({
         chapterId:item.chapterId,sequence:item.revisionSeq
       }))},
       select:{chapterId:true,sequence:true,content:true,text:true,
         contentHash:true,chapter:{select:{manuscriptId:true}}}
     });
     const plan=planSnapshotFork(manifest,source.manuscript.id,
       revisions as SnapshotRevisionSource[]);
     // This conditional write locks the book against concurrent edition forks.
     // The transaction rolls back fully if another tab won the race.
     const touched=await tx.book.updateMany({
       where:{id:bookId,workspaceId:book.workspaceId,archivedAt:null,
         updatedAt:expected},
       data:{status:'DRAFT'}
     });
     if(touched.count!==1)throw new Error('EDITION_CONFLICT');
     const edition=await tx.edition.create({
       data:{bookId,number:current.number+1,language:source.language}
     });
     const manuscript=await tx.manuscript.create({data:{editionId:edition.id}});
     // Historical v2 structure is reconstructed with fresh IDs. v1 snapshots
     // intentionally retain their legacy flat chapter structure.
     const partIds=new Map<string,string>((manifest.schema==='bookstudio.snapshot.v2'?manifest.parts:[])
       .map(item=>[item.id,randomUUID()] as const));
     if(manifest.schema==='bookstudio.snapshot.v2'&&manifest.parts.length){
       await tx.manuscriptPart.createMany({data:manifest.parts.map(part=>({
         id:partIds.get(part.id)!,manuscriptId:manuscript.id,title:part.title
       }))});
     }
     const newIds=new Map(plan.map(item=>[item.sourceChapterId,randomUUID()]));
     await tx.chapter.createMany({data:plan.map(item=>({
       id:newIds.get(item.sourceChapterId)!,manuscriptId:manuscript.id,
       title:item.title,position:item.position,revisionSeq:0,
       partId:item.partId?partIds.get(item.partId)??null:null
     }))});
     await tx.documentRevision.createMany({data:plan.map(item=>({
       chapterId:newIds.get(item.sourceChapterId)!,sequence:0,
       content:item.content as Prisma.InputJsonValue,
       text:item.text,contentHash:item.contentHash,authorId:user.id
     }))});
     await tx.auditEvent.create({data:{
       actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
       action:'BOOK_SNAPSHOT_FORKED_TO_EDITION',
       metadata:{snapshotId,sourceEditionId:source.id,previousEditionId:current.id,
         createdEditionId:edition.id,createdEditionNumber:edition.number,
         chapters:plan.length,parts:partIds.size,
         mode:'IMMUTABLE_SNAPSHOT_COPY'}
     }});
     return {kind:'OK',edition:{id:edition.id,number:edition.number,
       language:edition.language,chapterCount:plan.length},
       sourceSnapshotId:snapshot.id} as const;
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
     maxWait:5000,timeout:20000});
   if(result.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
   if(result.kind==='EDITION_CONFLICT')return errorResponse('EDITION_CONFLICT',409);
   if(result.kind==='SNAPSHOT_CORRUPT')return errorResponse('SNAPSHOT_CORRUPT',409);
   if(result.kind==='SNAPSHOT_COPY_TOO_LARGE')
     return errorResponse('SNAPSHOT_COPY_TOO_LARGE',422,
       {maxChapters:SNAPSHOT_FORK_MAX_CHAPTERS,maxBytes:SNAPSHOT_FORK_MAX_BYTES});
   return Response.json({edition:result.edition,sourceSnapshotId:result.sourceSnapshotId},
     {status:201,headers});
 }catch(e){
   const reason=e instanceof Error?e.message:'';
   if(reason==='SNAPSHOT_INVALID'||reason==='SNAPSHOT_DUPLICATE_CHAPTER'||
     reason==='SNAPSHOT_CORRUPT')return errorResponse('SNAPSHOT_CORRUPT',409);
   if(reason==='SNAPSHOT_COPY_TOO_LARGE')return errorResponse(reason,422);
   if(reason==='EDITION_CONFLICT'||
     (e&&typeof e==='object'&&'code' in e&&
       (e.code==='P2034'||e.code==='P2002')))
     return errorResponse('EDITION_CONFLICT',409);
   return errorResponse('SNAPSHOT_FORK_FAILED',503);
 }
}
