import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {randomUUID} from 'node:crypto';
import {normalizeTitle} from '@bookstudio/domain';
import {activeUser} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';
import {CHAPTER_COPY_MAX_ACTIVE_CHAPTERS,CHAPTER_COPY_MAX_BYTES,
  planChapterCopy,nextChapterPosition} from '@/lib/chapter-copy';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={'Cache-Control':'private, no-store'};

/** Copies one immutable saved revision to another current book in the SAME
 * workspace. Two book-row locks are acquired in ascending UUID order.
 * No comments, snapshots, import or scan provenance are inherited. */
export async function POST(request:Request,{params}:Ctx){
 if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,chapterId}=await params;
 if(!UUID.test(bookId)||!UUID.test(chapterId))
   return errorResponse('CHAPTER_TRANSFER_INVALID',400);
 const raw=await request.text().catch(()=>null);
 if(raw===null||Buffer.byteLength(raw,'utf8')>4096)
   return errorResponse('CHAPTER_TRANSFER_INVALID',413);
 let input:unknown;
 try{input=JSON.parse(raw);}catch{return errorResponse('CHAPTER_TRANSFER_INVALID',400);}
 if(!input||typeof input!=='object'||Array.isArray(input))
   return errorResponse('CHAPTER_TRANSFER_INVALID',400);
 const data=input as Record<string,unknown>;
 if(Object.keys(data).sort().join(',')!==
   'confirm,destinationBookId,expectedChapterUpdatedAt,expectedDestinationEditionId,expectedDestinationUpdatedAt,expectedRevision,expectedSourceEditionId,operationId,title'||
   data.confirm!=='COPY_CHAPTER_TO_BOOK_SAVED_ONLY'||
   typeof data.destinationBookId!=='string'||!UUID.test(data.destinationBookId)||
   data.destinationBookId===bookId||
   typeof data.operationId!=='string'||!UUID.test(data.operationId)||
   typeof data.expectedSourceEditionId!=='string'||!UUID.test(data.expectedSourceEditionId)||
   typeof data.expectedDestinationEditionId!=='string'||!UUID.test(data.expectedDestinationEditionId)||
   !Number.isSafeInteger(data.expectedRevision)||Number(data.expectedRevision)<0||
   typeof data.expectedChapterUpdatedAt!=='string'||
   typeof data.expectedDestinationUpdatedAt!=='string')
   return errorResponse('CHAPTER_TRANSFER_INVALID',400);
 const operationId=data.operationId as string,
   destinationBookId=data.destinationBookId as string,
   expectedRevision=data.expectedRevision as number;
 const dates=[data.expectedChapterUpdatedAt,data.expectedDestinationUpdatedAt]
   .map(value=>new Date(value as string));
 if(dates.some((date,index)=>!Number.isFinite(date.getTime())||
    date.toISOString()!==[data.expectedChapterUpdatedAt,
      data.expectedDestinationUpdatedAt][index]))
   return errorResponse('CHAPTER_TRANSFER_INVALID',400);
 let title:string;
 try{title=normalizeTitle(data.title);}catch{return errorResponse('TITLE_INVALID',400);}
 try{
   const result=await prisma.$transaction(async tx=>{
     // These locks are taken consistently in UUID order. Membership is checked
     // at SQL lock time so other tenants' rows are never locked.
     const books=await tx.$queryRaw<{id:string;workspaceId:string}[]>`
       SELECT b.id::text AS id,b.workspace_id::text AS "workspaceId"
       FROM books b
       JOIN memberships m ON m.workspace_id=b.workspace_id
       WHERE b.id IN (${bookId}::uuid,${destinationBookId}::uuid)
         AND b.archived_at IS NULL AND m.user_id=${user.id}::uuid
         AND m.role::text IN ('OWNER','EDITOR')
       ORDER BY b.id FOR UPDATE OF b
     `;
     if(books.length!==2||books[0].workspaceId!==books[1].workspaceId)
       return {kind:'NOT_FOUND'} as const;
     const workspaceId=books[0].workspaceId;
     const [sourceEdition,destEdition,destBook]=await Promise.all([
       tx.edition.findFirst({where:{bookId},orderBy:{number:'desc'},
         select:{id:true,manuscript:{select:{id:true}}}}),
       tx.edition.findFirst({where:{bookId:destinationBookId},
         orderBy:{number:'desc'},select:{id:true,manuscript:{select:{id:true}}}}),
       tx.book.findUnique({where:{id:destinationBookId},
         select:{updatedAt:true,status:true}})
     ]);
     if(!sourceEdition?.manuscript||!destEdition?.manuscript||!destBook)
       return {kind:'NOT_FOUND'} as const;
     const sourceChapter=await tx.chapter.findFirst({where:{
       id:chapterId,manuscriptId:sourceEdition.manuscript.id,deletedAt:null
     },select:{id:true,revisionSeq:true,updatedAt:true}});
     if(!sourceChapter)return {kind:'NOT_FOUND'} as const;
     // Under both book locks an interrupted retry must never create a second
     // chapter; the source-scoped audit holds the created target UUID.
     const old=await tx.auditEvent.findFirst({where:{
       action:'CHAPTER_COPIED_TO_BOOK',subjectId:chapterId,
       workspaceId,actorId:user.id,
       metadata:{path:['operationId'],equals:operationId}
     },select:{metadata:true}});
     if(old){
       const metadata=old.metadata as Record<string,unknown>|null;
       if(metadata?.destinationBookId!==destinationBookId||
          typeof metadata?.newChapterId!=='string'||
          !UUID.test(metadata.newChapterId))
         return {kind:'CONFLICT'} as const;
       const existing=await tx.chapter.findFirst({where:{
         id:metadata.newChapterId,deletedAt:null,
         manuscriptId:destEdition.manuscript.id
       },select:{id:true,title:true,revisionSeq:true}});
       if(!existing)return {kind:'CONFLICT'} as const;
       return {kind:'REPLAY',chapter:{id:existing.id,title:existing.title,
         revision:existing.revisionSeq},destinationBookId} as const;
     }
     if(sourceEdition.id!==data.expectedSourceEditionId||
        destEdition.id!==data.expectedDestinationEditionId||
        sourceChapter.revisionSeq!==expectedRevision||
        sourceChapter.updatedAt.getTime()!==dates[0].getTime()||
        destBook.updatedAt.getTime()!==dates[1].getTime())
       return {kind:'CONFLICT'} as const;
     const count=await tx.chapter.count({where:{
       manuscriptId:destEdition.manuscript.id,deletedAt:null
     }});
     if(count>=CHAPTER_COPY_MAX_ACTIVE_CHAPTERS)
       return {kind:'TOO_LARGE'} as const;
     const highest=await tx.chapter.aggregate({where:{
       manuscriptId:destEdition.manuscript.id},_max:{position:true}});
     const position=nextChapterPosition(highest._max.position);
     const saved=await tx.documentRevision.findUnique({where:{
       chapterId_sequence:{chapterId,sequence:expectedRevision}
     },select:{sequence:true,content:true,text:true,contentHash:true}});
     if(!saved)return {kind:'SOURCE_INVALID'} as const;
     const plan=planChapterCopy(saved,expectedRevision);
     const newChapter=await tx.chapter.create({data:{
       id:randomUUID(),manuscriptId:destEdition.manuscript.id,
       title,position,revisionSeq:0
     }});
     await tx.documentRevision.create({data:{
       chapterId:newChapter.id,sequence:0,
       content:plan.content as Prisma.InputJsonValue,text:plan.text,
       contentHash:plan.contentHash,authorId:user.id
     }});
     await tx.book.update({where:{id:destinationBookId},data:{status:'DRAFT'}});
     await tx.auditEvent.create({data:{
       action:'CHAPTER_COPIED_TO_BOOK',workspaceId,actorId:user.id,
       subjectId:chapterId,metadata:{
         operationId,sourceBookId:bookId,sourceRevision:expectedRevision,
         destinationBookId,newChapterId:newChapter.id,
         sourceEditionId:sourceEdition.id,destinationEditionId:destEdition.id,
         position,mode:'SAVED_CONTENT_ONLY'
       }
     }});
     return {kind:'CREATED',chapter:{id:newChapter.id,title:newChapter.title,
       revision:0,position},destinationBookId} as const;
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
      maxWait:7000,timeout:20000});
   if(result.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
   if(result.kind==='CONFLICT')return errorResponse('CHAPTER_TRANSFER_CONFLICT',409);
   if(result.kind==='SOURCE_INVALID')
     return errorResponse('CHAPTER_TRANSFER_SOURCE_INVALID',409);
   if(result.kind==='TOO_LARGE')return errorResponse('CHAPTER_TRANSFER_TOO_LARGE',422,
     {maxChapters:CHAPTER_COPY_MAX_ACTIVE_CHAPTERS,maxBytes:CHAPTER_COPY_MAX_BYTES});
   return Response.json({chapter:result.chapter,
     destinationBookId:result.destinationBookId,replayed:result.kind==='REPLAY'},
     {status:result.kind==='REPLAY'?200:201,headers:HEADERS});
 }catch(error){
   if(error instanceof Error&&error.message==='CHAPTER_COPY_TOO_LARGE')
     return errorResponse('CHAPTER_TRANSFER_TOO_LARGE',422,
       {maxChapters:CHAPTER_COPY_MAX_ACTIVE_CHAPTERS,maxBytes:CHAPTER_COPY_MAX_BYTES});
   if(error instanceof Error&&error.message==='CHAPTER_COPY_SOURCE_INVALID')
     return errorResponse('CHAPTER_TRANSFER_SOURCE_INVALID',409);
   if(error&&typeof error==='object'&&'code' in error&&
     (error.code==='P2034'||error.code==='P2002'))
     return errorResponse('CHAPTER_TRANSFER_CONFLICT',409);
   return errorResponse('CHAPTER_TRANSFER_FAILED',503);
 }
}
