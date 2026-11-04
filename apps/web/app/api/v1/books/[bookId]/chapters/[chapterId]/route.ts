import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {assertValidDocument,plainText,decideSave} from '@bookstudio/domain';
import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
async function authorized(bookId:string,chapterId:string,userId:string,write:boolean){
  const book=await accessToBook(bookId,userId,write),manuscript=book?.editions[0]?.manuscript;
  return manuscript?.chapters.find(c=>c.id===chapterId)??null;
}
export async function GET(_req:Request,{params}:{params:Promise<{bookId:string;chapterId:string}>}){
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,chapterId}=await params,chapter=await authorized(bookId,chapterId,user.id,false);
  if(!chapter)return errorResponse('NOT_FOUND',404);
  const rev=await prisma.documentRevision.findUnique({where:{chapterId_sequence:{chapterId,sequence:chapter.revisionSeq}}});
  if(!rev)return errorResponse('REVISION_MISSING',503);
  return Response.json({chapter:{id:chapter.id,title:chapter.title,revision:chapter.revisionSeq,content:rev.content}},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(req:Request,{params}:{params:Promise<{bookId:string;chapterId:string}>}){
  const started=performance.now();
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,chapterId}=await params,chapter=await authorized(bookId,chapterId,user.id,true);
  if(!chapter)return errorResponse('NOT_FOUND',404);
  const data=await req.json().catch(()=>null);
  if(!data||!Number.isSafeInteger(data.baseRevision))return errorResponse('VALIDATION_ERROR');
  let text:string;
  try{assertValidDocument(data.content);text=plainText(data.content);decideSave(data.baseRevision,chapter.revisionSeq);}
  catch(e){return errorResponse(e instanceof Error?e.message:'DOCUMENT_INVALID',e instanceof Error&&e.message==='REVISION_CONFLICT'?409:400,{currentRevision:chapter.revisionSeq});}
  const content=data.content as Prisma.InputJsonValue;
  const contentHash=createHash('sha256').update(JSON.stringify(data.content)).digest('hex');
  try{
    const revision=await prisma.$transaction(async tx=>{
      const changed=await tx.chapter.updateMany({where:{id:chapterId,revisionSeq:data.baseRevision,deletedAt:null},data:{revisionSeq:{increment:1}}});
      if(changed.count!==1)throw new Error('REVISION_CONFLICT');
      const next=data.baseRevision+1;
      await tx.documentRevision.create({data:{chapterId,sequence:next,content,text,contentHash,authorId:user.id}});
      return next;
    });
    return Response.json({ok:true,revision,contentHash},{headers:{'Cache-Control':'private, no-store','Server-Timing':`save;dur=${(performance.now()-started).toFixed(1)}`}});
  }catch(e){
    if(e instanceof Error&&(e.message==='REVISION_CONFLICT'||e.message.includes('Unique constraint')))return errorResponse('REVISION_CONFLICT',409);
    return errorResponse('SAVE_FAILED',503);
  }
}

/** Reversible deletion: source revisions, snapshots and comments remain intact. */
export async function DELETE(req:Request,{params}:{params:Promise<{bookId:string;chapterId:string}>}){
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(Number(req.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,chapterId}=await params,book=await accessToBook(bookId,user.id,true);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!book||!manuscriptId)return errorResponse('NOT_FOUND',404);
  const payload=await req.json().catch(()=>null);
  if(payload?.confirm!=='DELETE'||typeof payload.expectedUpdatedAt!=='string'||
     !Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision<0)
    return errorResponse('CHAPTER_DELETE_CONFIRMATION_REQUIRED',400);
  const expectedAt=new Date(payload.expectedUpdatedAt);
  if(!Number.isFinite(expectedAt.getTime()))return errorResponse('VALIDATION_ERROR',400);
  try{
    const result=await prisma.$transaction(async tx=>{
      const member=await tx.membership.findFirst({
        where:{userId:user.id,workspaceId:book.workspaceId,role:{in:['OWNER','EDITOR']}},select:{id:true}
      });
      const currentBook=await tx.book.findFirst({
        where:{id:bookId,workspaceId:book.workspaceId,archivedAt:null},select:{id:true}
      });
      if(!member||!currentBook)return 'NOT_FOUND' as const;
      const changed=await tx.chapter.updateMany({
        where:{id:chapterId,manuscriptId,deletedAt:null,updatedAt:expectedAt,
          revisionSeq:payload.expectedRevision},data:{deletedAt:new Date()}
      });
      if(changed.count!==1)return 'CHAPTER_CONFLICT' as const;
      await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
      await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
        subjectId:chapterId,action:'CHAPTER_SOFT_DELETED',
        metadata:{bookId,revision:payload.expectedRevision}}});
      return 'OK' as const;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    if(result==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(result==='CHAPTER_CONFLICT')return errorResponse('CHAPTER_CONFLICT',409);
    return Response.json({ok:true,deleted:true,restorable:true},{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){
    if((e as {code?:string})?.code==='P2034')return errorResponse('CHAPTER_CONFLICT',409);
    return errorResponse('CHAPTER_DELETE_FAILED',503);
  }
}
