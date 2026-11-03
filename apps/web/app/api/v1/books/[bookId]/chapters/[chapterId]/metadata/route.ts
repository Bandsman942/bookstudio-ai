import {prisma} from '@bookstudio/database';
import {normalizeTitle} from '@bookstudio/domain';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{bookId:string;chapterId:string}>};

/** Rename only metadata; never modify the content or its revision sequence. */
export async function PATCH(request:Request,{params}:Context){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  if(Number(request.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
  const {bookId,chapterId}=await params;
  const book=await accessToBook(bookId,user.id,true);
  const chapter=book?.editions[0]?.manuscript?.chapters.find(c=>c.id===chapterId);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!book||!chapter||!manuscriptId)return errorResponse('NOT_FOUND',404);
  const data=await request.json().catch(()=>null);
  if(typeof data?.expectedUpdatedAt!=='string')return errorResponse('VALIDATION_ERROR',400);
  const expected=new Date(data.expectedUpdatedAt);
  if(Number.isNaN(expected.getTime()))return errorResponse('VALIDATION_ERROR',400);
  let title:string;
  try{title=normalizeTitle(data.title);}catch{return errorResponse('TITLE_INVALID',400);}
  try{
    const result=await prisma.$transaction(async tx=>{
      const member=await tx.membership.findFirst({
        where:{userId:user.id,workspaceId:book.workspaceId,role:{in:['OWNER','EDITOR']}},
        select:{id:true}
      });
      if(!member)return {status:'NOT_FOUND'} as const;
      const fresh=await tx.chapter.findFirst({
        where:{id:chapterId,manuscriptId},
        select:{title:true,updatedAt:true,revisionSeq:true}
      });
      if(!fresh)return {status:'NOT_FOUND'} as const;
      if(fresh.updatedAt.getTime()!==expected.getTime())return {status:'CONFLICT'} as const;
      if(fresh.title===title)return {status:'UNCHANGED',chapter:{title,updatedAt:fresh.updatedAt,revision:fresh.revisionSeq}} as const;
      const updated=await tx.chapter.updateMany({
        where:{id:chapterId,manuscriptId,updatedAt:expected},
        data:{title}
      });
      if(updated.count!==1)throw new Error('CHAPTER_CONFLICT');
      const current=await tx.chapter.findUniqueOrThrow({
        where:{id:chapterId},select:{title:true,updatedAt:true,revisionSeq:true}
      });
      await tx.auditEvent.create({data:{
        actorId:user.id,workspaceId:book.workspaceId,subjectId:chapterId,
        action:'CHAPTER_RENAMED',metadata:{from:fresh.title,to:title}
      }});
      return {status:'OK',chapter:{title:current.title,updatedAt:current.updatedAt,revision:current.revisionSeq}} as const;
    },{isolationLevel:'Serializable'});
    if(result.status==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(result.status==='CONFLICT')return errorResponse('CHAPTER_CONFLICT',409);
    return Response.json({ok:true,chapter:result.chapter},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof Error&&(error.message==='CHAPTER_CONFLICT'||(error as {code?:string}).code==='P2034'))return errorResponse('CHAPTER_CONFLICT',409);
    return errorResponse('CHAPTER_RENAME_FAILED',503);
  }
}
