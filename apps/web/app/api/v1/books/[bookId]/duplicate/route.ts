import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {randomUUID} from 'node:crypto';
import {normalizeTitle} from '@bookstudio/domain';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {planBookDuplicate,BOOK_DUPLICATE_MAX_CHAPTERS,
 BOOK_DUPLICATE_MAX_BYTES} from '@/lib/book-duplicate';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
const HEADER={'Cache-Control':'private, no-store'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clone only the current saved manuscript into a new PRIVATE book within
 * the original workspace. Each copied chapter gets a new ID and revision 0.
 * Never copy permissions, source files, scan attestations, comments, snapshots
 * or provenance. Retry-safe with an operationId bound to the source book.
 */
export async function POST(request:Request,{params}:Ctx){
 if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId}=await params;
 if(!UUID.test(bookId))return errorResponse('BOOK_DUPLICATE_INVALID',400);
 const raw=await request.text().catch(()=>null);
 if(raw===null||Buffer.byteLength(raw,'utf8')>4096)
   return errorResponse('BOOK_DUPLICATE_INVALID',413);
 let input:unknown;
 try{input=JSON.parse(raw);}catch{return errorResponse('BOOK_DUPLICATE_INVALID',400);}
 if(!input||typeof input!=='object'||Array.isArray(input))
   return errorResponse('BOOK_DUPLICATE_INVALID',400);
 const data=input as Record<string,unknown>;
 if(Object.keys(data).sort().join(',')!==
    'confirm,expectedEditionId,expectedUpdatedAt,operationId,title'||
    data.confirm!=='DUPLICATE_BOOK_FROM_SAVED_EDITION'||
    typeof data.expectedEditionId!=='string'||!UUID.test(data.expectedEditionId)||
    typeof data.operationId!=='string'||!UUID.test(data.operationId)||
    typeof data.expectedUpdatedAt!=='string')
   return errorResponse('BOOK_DUPLICATE_INVALID',400);
 let title;
 try{title=normalizeTitle(data.title);}catch{
   return errorResponse('TITLE_INVALID',400);
 }
 const expected=new Date(data.expectedUpdatedAt);
 if(!Number.isFinite(expected.getTime())||
    expected.toISOString()!==data.expectedUpdatedAt)
   return errorResponse('BOOK_DUPLICATE_INVALID',400);
 try{
   const result=await prisma.$transaction(async tx=>{
     // Lock only when the member has edit rights in this workspace.
     // Chapter autosaves and edition switches use the same book-row lock.
     const locked=await tx.$queryRaw<{id:string}[]>`
       SELECT b.id::text AS id FROM books b
       JOIN memberships m ON m.workspace_id=b.workspace_id
       WHERE b.id=${bookId}::uuid AND b.archived_at IS NULL
         AND m.user_id=${user.id}::uuid
         AND m.role::text IN ('OWNER','EDITOR')
       FOR UPDATE OF b
     `;
     if(locked.length!==1)return {kind:'NOT_FOUND'} as const;
     const book=await tx.book.findFirst({
       where:{id:bookId,archivedAt:null,workspace:{
         memberships:{some:{userId:user.id,role:{in:['OWNER','EDITOR']}}}}},
       select:{id:true,workspaceId:true,updatedAt:true,bookType:true,
         language:true,editions:{orderBy:{number:'desc'},take:1,
           select:{id:true,language:true,manuscript:{select:{id:true,chapters:{
             where:{deletedAt:null},orderBy:[{position:'asc'},{id:'asc'}],
             select:{id:true,title:true,position:true,revisionSeq:true}
           }}}}}
       }
     });
     if(!book)return {kind:'NOT_FOUND'} as const;
     // A prior successful request is replayed without creating a second book.
     const already=await tx.auditEvent.findFirst({where:{
       action:'BOOK_DUPLICATED',subjectId:bookId,workspaceId:book.workspaceId,
       metadata:{path:['operationId'],equals:data.operationId}
     },select:{metadata:true}});
     if(already){
       const metadata=already.metadata as Record<string,unknown>|null;
       const createdId=metadata?.newBookId;
       if(typeof createdId!=='string'||!UUID.test(createdId))
         return {kind:'BOOK_DUPLICATE_SOURCE_INVALID'} as const;
       const clone=await tx.book.findFirst({where:{
         id:createdId,workspaceId:book.workspaceId,archivedAt:null
       },select:{id:true,title:true}});
       if(!clone)return {kind:'BOOK_DUPLICATE_SOURCE_INVALID'} as const;
       return {kind:'REPLAY',book:{id:clone.id,title:clone.title}} as const;
     }
     const edition=book.editions[0],manuscript=edition?.manuscript;
     if(!edition||!manuscript)return {kind:'BOOK_DUPLICATE_SOURCE_INVALID'} as const;
     if(book.updatedAt.getTime()!==expected.getTime()||
        edition.id!==data.expectedEditionId)
       return {kind:'BOOK_DUPLICATE_CONFLICT'} as const;
     const chapters=manuscript.chapters;
     if(chapters.length>BOOK_DUPLICATE_MAX_CHAPTERS)
       return {kind:'BOOK_DUPLICATE_TOO_LARGE'} as const;
     const revisions=chapters.length?await tx.documentRevision.findMany({
       where:{OR:chapters.map(chapter=>({chapterId:chapter.id,
         sequence:chapter.revisionSeq}))},
       select:{chapterId:true,sequence:true,content:true,text:true,contentHash:true}
     }):[];
     const plan=planBookDuplicate(chapters,revisions);
     const created=await tx.book.create({data:{
       workspaceId:book.workspaceId,ownerId:user.id,title,
       bookType:book.bookType,language:book.language,status:'DRAFT'
     }});
     const newEdition=await tx.edition.create({
       data:{bookId:created.id,number:1,language:edition.language}
     });
     const newManuscript=await tx.manuscript.create({
       data:{editionId:newEdition.id}
     });
     const ids=new Map(plan.map(item=>[item.sourceChapterId,randomUUID()]));
     if(plan.length){
       await tx.chapter.createMany({data:plan.map(item=>({
         id:ids.get(item.sourceChapterId)!,manuscriptId:newManuscript.id,
         title:item.title,position:item.position,revisionSeq:0
       }))});
       await tx.documentRevision.createMany({data:plan.map(item=>({
         chapterId:ids.get(item.sourceChapterId)!,sequence:0,
         content:item.content as Prisma.InputJsonValue,
         text:item.text,contentHash:item.contentHash,authorId:user.id
       }))});
     }
     await tx.auditEvent.create({data:{
       actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
       action:'BOOK_DUPLICATED',
       metadata:{operationId:data.operationId,newBookId:created.id,
         sourceEditionId:edition.id,newEditionId:newEdition.id,
         chapters:plan.length,mode:'CURRENT_SAVED_MANUSCRIPT_ONLY'}
     }});
     return {kind:'CREATED',book:{id:created.id,title:created.title,
       chapterCount:plan.length,editionId:newEdition.id}} as const;
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
     maxWait:5000,timeout:20000});
   if(result.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
   if(result.kind==='BOOK_DUPLICATE_CONFLICT')
     return errorResponse('BOOK_DUPLICATE_CONFLICT',409);
   if(result.kind==='BOOK_DUPLICATE_SOURCE_INVALID')
     return errorResponse('BOOK_DUPLICATE_SOURCE_INVALID',409);
   if(result.kind==='BOOK_DUPLICATE_TOO_LARGE')
     return errorResponse('BOOK_DUPLICATE_TOO_LARGE',422,
       {maxChapters:BOOK_DUPLICATE_MAX_CHAPTERS,maxBytes:BOOK_DUPLICATE_MAX_BYTES});
   return Response.json({book:result.book,replayed:result.kind==='REPLAY'},
     {status:result.kind==='REPLAY'?200:201,headers:HEADER});
 }catch(error){
   if(error instanceof Error&&error.message==='BOOK_DUPLICATE_SOURCE_INVALID')
     return errorResponse('BOOK_DUPLICATE_SOURCE_INVALID',409);
   if(error instanceof Error&&error.message==='BOOK_DUPLICATE_TOO_LARGE')
     return errorResponse('BOOK_DUPLICATE_TOO_LARGE',422,
       {maxChapters:BOOK_DUPLICATE_MAX_CHAPTERS,maxBytes:BOOK_DUPLICATE_MAX_BYTES});
   if(error&&typeof error==='object'&&'code' in error&&
     (error.code==='P2034'||error.code==='P2002'))
     return errorResponse('BOOK_DUPLICATE_CONFLICT',409);
   return errorResponse('BOOK_DUPLICATE_FAILED',503);
 }
}
