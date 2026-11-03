import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';

export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string;commentId:string}>};

export async function PATCH(req:Request,{params}:Ctx){
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,chapterId,commentId}=await params;
  const book=await accessToBook(bookId,user.id,true);
  if(!book?.editions[0]?.manuscript?.chapters.some(c=>c.id===chapterId))return errorResponse('NOT_FOUND',404);
  const data=await req.json().catch(()=>null);
  if(!['OPEN','RESOLVED'].includes(data?.status))return errorResponse('COMMENT_STATUS_INVALID');
  try{
    const changed=await prisma.$transaction(async tx=>{
      const member=await tx.membership.findFirst({
        where:{workspaceId:book.workspaceId,userId:user.id,role:{in:['OWNER','EDITOR']}},
        select:{id:true}
      });
      if(!member)throw new Error('NOT_FOUND');
      const result=await tx.editorialComment.updateMany({
        where:{id:commentId,chapterId},
        data:{status:data.status,resolvedAt:data.status==='RESOLVED'?new Date():null}
      });
      if(result.count!==1)throw new Error('NOT_FOUND');
      await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
        subjectId:chapterId,action:'EDITORIAL_COMMENT_STATUS_CHANGED',
        metadata:{commentId,status:data.status}}});
      return data.status as string;
    });
    return Response.json({ok:true,status:changed},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return errorResponse('NOT_FOUND',404);
  }
}
