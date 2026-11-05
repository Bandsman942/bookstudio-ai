import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{bookId:string;chapterId:string}>}){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(Number(request.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,chapterId}=await params,book=await accessToBook(bookId,user.id,true);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!book||!manuscriptId)return errorResponse('NOT_FOUND',404);
  const body=await request.json().catch(()=>null);
  if(body?.confirm!=='RESTORE_CHAPTER'||typeof body.expectedUpdatedAt!=='string')
    return errorResponse('CHAPTER_RESTORE_CONFIRMATION_REQUIRED',400);
  const expected=new Date(body.expectedUpdatedAt);
  if(!Number.isFinite(expected.getTime()))return errorResponse('VALIDATION_ERROR',400);
  try{
    const result=await prisma.$transaction(async tx=>{
      const allowed=await tx.membership.findFirst({
        where:{userId:user.id,workspaceId:book.workspaceId,role:{in:['OWNER','EDITOR']}},select:{id:true}
      });
      const currentBook=await tx.book.findFirst({
        where:{id:bookId,workspaceId:book.workspaceId,archivedAt:null},select:{id:true}
      });
      if(!allowed||!currentBook)return 'NOT_FOUND' as const;
      // Restoring a chapter appends it to the active structure. It cannot
      // silently collide with positions already changed by a recent reorder.
      const greatest=await tx.chapter.aggregate({where:{manuscriptId},_max:{position:true}});
      const changed=await tx.chapter.updateMany({
        where:{id:chapterId,manuscriptId,deletedAt:{not:null},updatedAt:expected},
        data:{deletedAt:null,position:(greatest._max.position??-1)+1}
      });
      if(changed.count!==1)return 'CHAPTER_CONFLICT' as const;
      await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
      await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
        subjectId:chapterId,action:'CHAPTER_RESTORED',metadata:{bookId}}});
      return 'OK' as const;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    if(result==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(result==='CHAPTER_CONFLICT')return errorResponse('CHAPTER_CONFLICT',409);
    return Response.json({ok:true,restored:true},{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){
    if((e as {code?:string})?.code==='P2034')return errorResponse('CHAPTER_CONFLICT',409);
    return errorResponse('CHAPTER_RESTORE_FAILED',503);
  }
}
