import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {randomUUID} from 'node:crypto';
import {normalizeTitle} from '@bookstudio/domain';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {planChapterCopy,nextChapterPosition,
 CHAPTER_COPY_MAX_ACTIVE_CHAPTERS,CHAPTER_COPY_MAX_BYTES} from '@/lib/chapter-copy';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={'Cache-Control':'private, no-store'};

/** Append an independent chapter from an exact, SAVED revision of a current
 * edition. Do not clone comments/import provenance/security attestations.
 * A transaction + book FOR UPDATE serializes against chapter autosave.
 */
export async function POST(request:Request,{params}:Ctx){
 if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,chapterId}=await params;
 if(!UUID.test(bookId)||!UUID.test(chapterId))
   return errorResponse('CHAPTER_COPY_INVALID',400);
 const raw=await request.text().catch(()=>null);
 if(raw===null||Buffer.byteLength(raw,'utf8')>4096)
   return errorResponse('CHAPTER_COPY_INVALID',413);
 let input:unknown;
 try{input=JSON.parse(raw);}catch{return errorResponse('CHAPTER_COPY_INVALID',400);}
 if(!input||typeof input!=='object'||Array.isArray(input))
   return errorResponse('CHAPTER_COPY_INVALID',400);
 const data=input as Record<string,unknown>;
 if(Object.keys(data).sort().join(',')!==
    'confirm,expectedChapterUpdatedAt,expectedEditionId,expectedRevision,operationId,title'||
    data.confirm!=='DUPLICATE_CHAPTER_FROM_SAVED'||
    typeof data.operationId!=='string'||!UUID.test(data.operationId)||
    typeof data.expectedEditionId!=='string'||!UUID.test(data.expectedEditionId)||
    typeof data.expectedChapterUpdatedAt!=='string'||
    !Number.isSafeInteger(data.expectedRevision)||Number(data.expectedRevision)<0)
   return errorResponse('CHAPTER_COPY_INVALID',400);
 const operationId=data.operationId as string;
 const expectedRevision=data.expectedRevision as number;
 const expectedAt=new Date(data.expectedChapterUpdatedAt);
 if(!Number.isFinite(expectedAt.getTime())||
    expectedAt.toISOString()!==data.expectedChapterUpdatedAt)
   return errorResponse('CHAPTER_COPY_INVALID',400);
 let title;
 try{title=normalizeTitle(data.title);}catch{
   return errorResponse('TITLE_INVALID',400);
 }
 try{
   const outcome=await prisma.$transaction(async tx=>{
     const locked=await tx.$queryRaw<{workspaceId:string}[]>`
       SELECT b.workspace_id::text AS "workspaceId" FROM books b
       JOIN memberships m ON m.workspace_id=b.workspace_id
       WHERE b.id=${bookId}::uuid AND b.archived_at IS NULL
         AND m.user_id=${user.id}::uuid
         AND m.role::text IN ('OWNER','EDITOR')
       FOR UPDATE OF b
     `;
     if(locked.length!==1)return {kind:'NOT_FOUND'} as const;
     const workspaceId=locked[0].workspaceId;
     const current=await tx.edition.findFirst({where:{bookId},
       orderBy:{number:'desc'},select:{id:true,manuscript:{select:{id:true}}}});
     if(!current?.manuscript)return {kind:'NOT_FOUND'} as const;
     const source=await tx.chapter.findFirst({where:{
       id:chapterId,manuscriptId:current.manuscript.id,deletedAt:null
     },select:{id:true,revisionSeq:true,updatedAt:true,title:true}});
     if(!source)return {kind:'NOT_FOUND'} as const;
     const replay=await tx.auditEvent.findFirst({where:{
       action:'CHAPTER_DUPLICATED',subjectId:chapterId,workspaceId,
       actorId:user.id,metadata:{path:['operationId'],equals:operationId}
     },select:{metadata:true}});
     if(replay){
       const payload=replay.metadata as Record<string,unknown>|null;
       const copyId=payload?.newChapterId;
       if(typeof copyId!=='string'||!UUID.test(copyId))
         return {kind:'CHAPTER_COPY_SOURCE_INVALID'} as const;
       const copy=await tx.chapter.findFirst({where:{id:copyId,
         manuscriptId:current.manuscript.id,deletedAt:null},
         select:{id:true,title:true,revisionSeq:true}});
       if(!copy)return {kind:'CHAPTER_COPY_SOURCE_INVALID'} as const;
       return {kind:'REPLAY',chapter:{id:copy.id,title:copy.title,
         revision:copy.revisionSeq}} as const;
     }
     if(current.id!==data.expectedEditionId||
        source.revisionSeq!==expectedRevision||
        source.updatedAt.getTime()!==expectedAt.getTime())
       return {kind:'CONFLICT'} as const;
     const activeCount=await tx.chapter.count({
       where:{manuscriptId:current.manuscript.id,deletedAt:null}
     });
     if(activeCount>=CHAPTER_COPY_MAX_ACTIVE_CHAPTERS)
       return {kind:'TOO_LARGE'} as const;
     const lastPosition=await tx.chapter.aggregate({
       where:{manuscriptId:current.manuscript.id},_max:{position:true}
     });
     const position=nextChapterPosition(lastPosition._max.position);
     const revision=await tx.documentRevision.findUnique({
       where:{chapterId_sequence:{chapterId,sequence:expectedRevision}},
       select:{sequence:true,content:true,text:true,contentHash:true}
     });
     if(!revision)return {kind:'CHAPTER_COPY_SOURCE_INVALID'} as const;
     const plan=planChapterCopy(revision,expectedRevision);
     const created=await tx.chapter.create({data:{
       id:randomUUID(),manuscriptId:current.manuscript.id,
       title,position,revisionSeq:0
     }});
     await tx.documentRevision.create({data:{
       chapterId:created.id,sequence:0,
       content:plan.content as Prisma.InputJsonValue,
       text:plan.text,contentHash:plan.contentHash,authorId:user.id
     }});
     // Adding an editorial chapter invalidates prior approval/publish labels.
     await tx.book.update({where:{id:bookId},data:{status:'DRAFT'}});
     await tx.auditEvent.create({data:{
       actorId:user.id,workspaceId,subjectId:chapterId,
       action:'CHAPTER_DUPLICATED',metadata:{
         operationId,newChapterId:created.id,bookId,editionId:current.id,
         sourceRevision:expectedRevision,newPosition:position,
         mode:'SAVED_CONTENT_ONLY'
       }
     }});
     return {kind:'CREATED',chapter:{id:created.id,title:created.title,
       revision:0,position}} as const;
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
     maxWait:5000,timeout:15000});
   if(outcome.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
   if(outcome.kind==='CONFLICT')return errorResponse('CHAPTER_COPY_CONFLICT',409);
   if(outcome.kind==='CHAPTER_COPY_SOURCE_INVALID')
     return errorResponse('CHAPTER_COPY_SOURCE_INVALID',409);
   if(outcome.kind==='TOO_LARGE')
     return errorResponse('CHAPTER_COPY_TOO_LARGE',422,
       {maxActiveChapters:CHAPTER_COPY_MAX_ACTIVE_CHAPTERS,
        maxBytes:CHAPTER_COPY_MAX_BYTES});
   return Response.json({chapter:outcome.chapter,replayed:outcome.kind==='REPLAY'},
     {status:outcome.kind==='REPLAY'?200:201,headers:HEADERS});
 }catch(error){
   if(error instanceof Error&&error.message==='CHAPTER_COPY_SOURCE_INVALID')
     return errorResponse('CHAPTER_COPY_SOURCE_INVALID',409);
   if(error instanceof Error&&error.message==='CHAPTER_COPY_TOO_LARGE')
     return errorResponse('CHAPTER_COPY_TOO_LARGE',422,
       {maxActiveChapters:CHAPTER_COPY_MAX_ACTIVE_CHAPTERS,
        maxBytes:CHAPTER_COPY_MAX_BYTES});
   if(error&&typeof error==='object'&&'code' in error&&
     (error.code==='P2034'||error.code==='P2002'))
     return errorResponse('CHAPTER_COPY_CONFLICT',409);
   return errorResponse('CHAPTER_COPY_FAILED',503);
 }
}
