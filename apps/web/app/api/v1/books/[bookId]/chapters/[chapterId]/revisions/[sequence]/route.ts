import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {assertValidDocument} from '@bookstudio/domain';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string;sequence:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INT=/^(0|[1-9][0-9]{0,8})$/;
const HEADERS={'Cache-Control':'private, no-store'};
function parsed(input:{bookId:string;chapterId:string;sequence:string}){
 if(!UUID.test(input.bookId)||!UUID.test(input.chapterId)||!INT.test(input.sequence))
   return null;
 const sequence=Number(input.sequence);
 return Number.isSafeInteger(sequence)?sequence:null;
}

/** Exact historical plain-text preview; no HTML rendering or mutation. */
export async function GET(_request:Request,{params}:Ctx){
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const input=await params,sequence=parsed(input);
 if(sequence===null)return errorResponse('REVISION_REQUEST_INVALID',400);
 const {bookId,chapterId}=input;
 try{
   const edition=await prisma.edition.findFirst({
     where:{bookId,book:{archivedAt:null,
       workspace:{memberships:{some:{userId:user.id}}}}},
     orderBy:{number:'desc'},
     select:{manuscript:{select:{chapters:{where:{id:chapterId,deletedAt:null},
       select:{id:true,title:true,revisionSeq:true}}}}}
   });
   const chapter=edition?.manuscript?.chapters[0];
   if(!chapter||sequence>chapter.revisionSeq)return errorResponse('NOT_FOUND',404);
   const revision=await prisma.documentRevision.findUnique({
     where:{chapterId_sequence:{chapterId,sequence}},
     select:{sequence:true,createdAt:true,text:true,
       author:{select:{name:true}}}
   });
   if(!revision)return errorResponse('REVISION_SOURCE_INVALID',409);
   return Response.json({revision:{sequence:revision.sequence,
     title:chapter.title,authorName:revision.author.name,
     recordedAt:revision.createdAt,text:revision.text,
     isCurrent:sequence===chapter.revisionSeq}},{headers:HEADERS});
 }catch{return errorResponse('REVISION_HISTORY_UNAVAILABLE',503);}
}

/** Append-only restore. Lock book row before determining current edition so a
 * stale tab cannot write to a chapter made historical by another transaction. */
export async function POST(request:Request,{params}:Ctx){
 if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const input=await params,sequence=parsed(input);
 if(sequence===null)return errorResponse('REVISION_REQUEST_INVALID',400);
 const raw=await request.text().catch(()=>null);
 if(raw===null||Buffer.byteLength(raw,'utf8')>2048)
   return errorResponse('REVISION_REQUEST_INVALID',413);
 let body:unknown;
 try{body=JSON.parse(raw);}catch{return errorResponse('REVISION_REQUEST_INVALID',400);}
 if(!body||typeof body!=='object'||Array.isArray(body))
   return errorResponse('REVISION_REQUEST_INVALID',400);
 const data=body as Record<string,unknown>;
 if(Object.keys(data).sort().join(',')!=='confirm,expectedRevision'||
   data.confirm!=='RESTORE_CHAPTER_REVISION'||
   !Number.isSafeInteger(data.expectedRevision)||Number(data.expectedRevision)<0)
   return errorResponse('REVISION_REQUEST_INVALID',400);
 const {bookId,chapterId}=input;
 try{
   const outcome=await prisma.$transaction(async tx=>{
     const locked=await tx.$queryRaw<{workspaceId:string}[]>`
       SELECT workspace_id::text AS "workspaceId" FROM books
       WHERE id=${bookId}::uuid AND archived_at IS NULL FOR UPDATE
     `;
     if(locked.length!==1)return {kind:'NOT_FOUND'} as const;
     const membership=await tx.membership.findFirst({where:{
       userId:user.id,workspaceId:locked[0].workspaceId,
       role:{in:['OWNER','EDITOR']}
     },select:{id:true}});
     if(!membership)return {kind:'NOT_FOUND'} as const;
     const edition=await tx.edition.findFirst({
       where:{bookId},orderBy:{number:'desc'},
       select:{manuscript:{select:{id:true}}}
     });
     if(!edition?.manuscript)return {kind:'NOT_FOUND'} as const;
     const chapter=await tx.chapter.findFirst({
       where:{id:chapterId,manuscriptId:edition.manuscript.id,deletedAt:null},
       select:{id:true,revisionSeq:true}
     });
     if(!chapter)return {kind:'NOT_FOUND'} as const;
     if(chapter.revisionSeq!==data.expectedRevision)
       return {kind:'REVISION_CONFLICT'} as const;
     if(sequence>=chapter.revisionSeq)
       return {kind:'REVISION_NOT_HISTORICAL'} as const;
     const source=await tx.documentRevision.findUnique({
       where:{chapterId_sequence:{chapterId,sequence}},
       select:{content:true,text:true,contentHash:true}
     });
     if(!source||typeof source.text!=='string'||
       !/^[a-f0-9]{64}$/i.test(source.contentHash))
       return {kind:'REVISION_SOURCE_INVALID'} as const;
     try{assertValidDocument(source.content);}
     catch{return {kind:'REVISION_SOURCE_INVALID'} as const;}
     const modified=await tx.chapter.updateMany({
       where:{id:chapterId,manuscriptId:edition.manuscript.id,
         revisionSeq:chapter.revisionSeq,deletedAt:null},
       data:{revisionSeq:{increment:1}}
     });
     if(modified.count!==1)throw new Error('REVISION_CONFLICT');
     const next=chapter.revisionSeq+1;
     await tx.documentRevision.create({data:{
       chapterId,sequence:next,content:source.content as Prisma.InputJsonValue,
       text:source.text,contentHash:source.contentHash,authorId:user.id
     }});
     // A manuscript edit invalidates any prior editorial approval / publish label.
     await tx.book.update({where:{id:bookId},data:{status:'DRAFT'}});
     await tx.auditEvent.create({data:{
       actorId:user.id,workspaceId:locked[0].workspaceId,subjectId:chapterId,
       action:'CHAPTER_REVISION_RESTORED',
       metadata:{bookId,fromSequence:sequence,toSequence:next}
     }});
     return {kind:'OK',revision:next,restoredFrom:sequence} as const;
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
     maxWait:5000,timeout:15000});
   if(outcome.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
   if(outcome.kind==='REVISION_CONFLICT')return errorResponse('REVISION_CONFLICT',409);
   if(outcome.kind==='REVISION_NOT_HISTORICAL')
     return errorResponse('REVISION_NOT_HISTORICAL',422);
   if(outcome.kind==='REVISION_SOURCE_INVALID')
     return errorResponse('REVISION_SOURCE_INVALID',409);
   return Response.json({ok:true,revision:outcome.revision,
     restoredFrom:outcome.restoredFrom},{headers:HEADERS});
 }catch(error){
   if(error instanceof Error&&error.message==='REVISION_CONFLICT'||
     error&&typeof error==='object'&&'code' in error&&
       (error.code==='P2034'||error.code==='P2002'))
     return errorResponse('REVISION_CONFLICT',409);
   return errorResponse('REVISION_RESTORE_FAILED',503);
 }
}
