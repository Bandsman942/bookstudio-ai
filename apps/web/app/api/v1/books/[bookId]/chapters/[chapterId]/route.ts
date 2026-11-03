import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {assertValidDocument,plainText,decideSave} from '@bookstudio/domain';
import {createHash} from 'node:crypto';
import type {Prisma} from '@prisma/client';
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
      const changed=await tx.chapter.updateMany({where:{id:chapterId,revisionSeq:data.baseRevision},data:{revisionSeq:{increment:1}}});
      if(changed.count!==1)throw new Error('REVISION_CONFLICT');
      const next=data.baseRevision+1;
      await tx.documentRevision.create({data:{chapterId,sequence:next,content,text,contentHash,authorId:user.id}});
      return next;
    });
    return Response.json({ok:true,revision,contentHash});
  }catch(e){
    if(e instanceof Error&&(e.message==='REVISION_CONFLICT'||e.message.includes('Unique constraint')))return errorResponse('REVISION_CONFLICT',409);
    return errorResponse('SAVE_FAILED',503);
  }
}
