import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {createHash,randomUUID} from 'node:crypto';
import {normalizeTitle} from '@bookstudio/domain';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {planChapterMerge,nextChapterPosition,
 CHAPTER_MERGE_MAX_ACTIVE_CHAPTERS,CHAPTER_MERGE_MAX_BYTES}
 from '@/lib/chapter-merge';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={'Cache-Control':'private, no-store'};
const EMPTY_DETAIL={maxActiveChapters:CHAPTER_MERGE_MAX_ACTIVE_CHAPTERS,
  maxBytes:CHAPTER_MERGE_MAX_BYTES};

/** Append a NEW chapter containing the two source chapters' exact current
 * saved ProseMirror blocks. Sources stay unchanged. */
export async function POST(request:Request,{params}:Ctx){
 if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,chapterId}=await params;
 if(!UUID.test(bookId)||!UUID.test(chapterId))
   return errorResponse('CHAPTER_MERGE_INVALID',400);
 const raw=await request.text().catch(()=>null);
 if(raw===null||Buffer.byteLength(raw,'utf8')>4096)
   return errorResponse('CHAPTER_MERGE_INVALID',413);
 let input:unknown;
 try{input=JSON.parse(raw);}catch{return errorResponse('CHAPTER_MERGE_INVALID',400);}
 if(!input||typeof input!=='object'||Array.isArray(input))
   return errorResponse('CHAPTER_MERGE_INVALID',400);
 const data=input as Record<string,unknown>;
 if(Object.keys(data).sort().join(',')!==
  'confirm,expectedEditionId,expectedFirstRevision,expectedFirstUpdatedAt,expectedSecondRevision,expectedSecondUpdatedAt,operationId,secondChapterId,title'||
    data.confirm!=='MERGE_SAVED_CHAPTERS_AS_NEW'||
    typeof data.secondChapterId!=='string'||!UUID.test(data.secondChapterId)||
    data.secondChapterId===chapterId||
    typeof data.expectedEditionId!=='string'||!UUID.test(data.expectedEditionId)||
    typeof data.operationId!=='string'||!UUID.test(data.operationId)||
    !Number.isSafeInteger(data.expectedFirstRevision)||
    Number(data.expectedFirstRevision)<0||
    !Number.isSafeInteger(data.expectedSecondRevision)||
    Number(data.expectedSecondRevision)<0||
    typeof data.expectedFirstUpdatedAt!=='string'||
    typeof data.expectedSecondUpdatedAt!=='string')
   return errorResponse('CHAPTER_MERGE_INVALID',400);
 const secondChapterId=data.secondChapterId as string,
       operationId=data.operationId as string,
       firstSequence=data.expectedFirstRevision as number,
       secondSequence=data.expectedSecondRevision as number;
 const times=[data.expectedFirstUpdatedAt,data.expectedSecondUpdatedAt];
 const dates=times.map(value=>new Date(value as string));
 if(dates.some((dt,index)=>!Number.isFinite(dt.getTime())||
     dt.toISOString()!==times[index]))
   return errorResponse('CHAPTER_MERGE_INVALID',400);
 let title:string;
 try{title=normalizeTitle(data.title);}catch{return errorResponse('TITLE_INVALID',400);}
 // An operationId belongs to one exact instruction; raw title is never
 // logged in the audit metadata, only a one-way digest of the instruction.
 const requestHash=createHash('sha256').update(JSON.stringify({
   bookId,chapterId,secondChapterId,operationId,title,
   expectedEditionId:data.expectedEditionId,
   firstSequence,secondSequence,
   firstUpdatedAt:times[0],secondUpdatedAt:times[1]
 })).digest('hex');
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
     const edition=await tx.edition.findFirst({where:{bookId},
       orderBy:{number:'desc'},select:{id:true,manuscript:{select:{id:true}}}});
     if(!edition?.manuscript)return {kind:'NOT_FOUND'} as const;
     const chapters=await tx.chapter.findMany({where:{
       manuscriptId:edition.manuscript.id,deletedAt:null,
       id:{in:[chapterId,secondChapterId]}
     },select:{id:true,title:true,revisionSeq:true,updatedAt:true}});
     if(chapters.length!==2)return {kind:'NOT_FOUND'} as const;
     const byId=new Map(chapters.map(c=>[c.id,c]));
     const first=byId.get(chapterId)!,second=byId.get(secondChapterId)!;
     const replay=await tx.auditEvent.findFirst({where:{
       action:'CHAPTERS_MERGED_AS_NEW',actorId:user.id,
       workspaceId,subjectId:chapterId,
       metadata:{path:['operationId'],equals:operationId}
     },select:{metadata:true}});
     if(replay){
       const old=replay.metadata as Record<string,unknown>|null;
       if(old?.requestHash!==requestHash||
          typeof old?.newChapterId!=='string'||!UUID.test(old.newChapterId))
         return {kind:'CONFLICT'} as const;
       const created=await tx.chapter.findFirst({where:{
         id:old.newChapterId,manuscriptId:edition.manuscript.id,deletedAt:null
       },select:{id:true,title:true,revisionSeq:true}});
       if(!created)return {kind:'CONFLICT'} as const;
       return {kind:'REPLAY',chapter:{id:created.id,title:created.title,
         revision:created.revisionSeq},bookId} as const;
     }
     if(edition.id!==data.expectedEditionId||
        first.revisionSeq!==firstSequence||second.revisionSeq!==secondSequence||
        first.updatedAt.getTime()!==dates[0].getTime()||
        second.updatedAt.getTime()!==dates[1].getTime())
       return {kind:'CONFLICT'} as const;
     const count=await tx.chapter.count({where:{
       manuscriptId:edition.manuscript.id,deletedAt:null
     }});
     if(count>=CHAPTER_MERGE_MAX_ACTIVE_CHAPTERS)
       return {kind:'TOO_LARGE'} as const;
     const max=await tx.chapter.aggregate({where:{
       manuscriptId:edition.manuscript.id},_max:{position:true}});
     const position=nextChapterPosition(max._max.position);
     const revisions=await tx.documentRevision.findMany({where:{OR:[
       {chapterId,sequence:firstSequence},
       {chapterId:secondChapterId,sequence:secondSequence}
     ]},select:{chapterId:true,sequence:true,content:true,text:true,contentHash:true}});
     if(revisions.length!==2)return {kind:'SOURCE_INVALID'} as const;
     const byRevisionId=new Map(revisions.map(rev=>[rev.chapterId,rev]));
     const firstRevision=byRevisionId.get(chapterId),
       secondRevision=byRevisionId.get(secondChapterId);
     if(!firstRevision||!secondRevision)
       return {kind:'SOURCE_INVALID'} as const;
     const plan=planChapterMerge(firstRevision,secondRevision,firstSequence,secondSequence);
     const created=await tx.chapter.create({data:{
       id:randomUUID(),manuscriptId:edition.manuscript.id,
       title,position,revisionSeq:0
     }});
     await tx.documentRevision.create({data:{
       chapterId:created.id,sequence:0,
       content:plan.content as Prisma.InputJsonValue,
       text:plan.text,contentHash:plan.contentHash,
       authorId:user.id
     }});
     await tx.book.update({where:{id:bookId},data:{status:'DRAFT'}});
     await tx.auditEvent.create({data:{
       actorId:user.id,workspaceId,subjectId:chapterId,
       action:'CHAPTERS_MERGED_AS_NEW',metadata:{
         operationId,requestHash,bookId,editionId:edition.id,
         sourceChapterId:chapterId,secondChapterId,
         firstSequence,secondSequence,newChapterId:created.id,
         position,mergedBlockCount:plan.blockCount,
         mergedBytes:plan.byteCount,mode:'SAVED_BLOCKS_NON_DESTRUCTIVE'
       }
     }});
     return {kind:'CREATED',chapter:{
       id:created.id,title:created.title,revision:0,position
     },bookId} as const;
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
     maxWait:7000,timeout:20000});
   if(outcome.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
   if(outcome.kind==='CONFLICT')return errorResponse('CHAPTER_MERGE_CONFLICT',409);
   if(outcome.kind==='SOURCE_INVALID')
     return errorResponse('CHAPTER_MERGE_SOURCE_INVALID',409);
   if(outcome.kind==='TOO_LARGE')
     return errorResponse('CHAPTER_MERGE_TOO_LARGE',422,EMPTY_DETAIL);
   return Response.json({chapter:outcome.chapter,bookId,
     replayed:outcome.kind==='REPLAY'},
     {status:outcome.kind==='REPLAY'?200:201,headers:HEADERS});
 }catch(error){
   if(error instanceof Error&&error.message==='CHAPTER_MERGE_TOO_LARGE')
     return errorResponse('CHAPTER_MERGE_TOO_LARGE',422,EMPTY_DETAIL);
   if(error instanceof Error&&error.message==='CHAPTER_MERGE_SOURCE_INVALID')
     return errorResponse('CHAPTER_MERGE_SOURCE_INVALID',409);
   if(error&&typeof error==='object'&&'code' in error&&
     (error.code==='P2034'||error.code==='P2002'))
     return errorResponse('CHAPTER_MERGE_CONFLICT',409);
   return errorResponse('CHAPTER_MERGE_FAILED',503);
 }
}
