import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse} from '@/lib/security';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{bookId:string}>}){
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId}=await params,book=await accessToBook(bookId,user.id,true);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!manuscriptId)return errorResponse('NOT_FOUND',404);
  const chapters=await prisma.chapter.findMany({
    where:{manuscriptId,deletedAt:{not:null}},
    orderBy:{deletedAt:'desc'},take:100,
    select:{id:true,title:true,updatedAt:true,deletedAt:true,revisionSeq:true}
  });
  return Response.json({chapters},{headers:{'Cache-Control':'private, no-store'}});
}
