import {activeUser,accessToBook} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {prisma} from '@bookstudio/database';
import {emptyDocument,normalizeTitle} from '@bookstudio/domain';
import {createHash} from 'node:crypto';
export async function POST(req:Request,{params}:{params:Promise<{bookId:string}>}){
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId}=await params,book=await accessToBook(bookId,user.id,true);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!manuscriptId)return errorResponse('NOT_FOUND',404);
  const data=await req.json().catch(()=>null);let title:string;
  try{title=normalizeTitle(data?.title);}catch{return errorResponse('TITLE_INVALID');}
  try{
    const chapter=await prisma.$transaction(async tx=>{
      const position=await tx.chapter.count({where:{manuscriptId}});
      const created=await tx.chapter.create({data:{manuscriptId,title,position}});
      const content=emptyDocument();
      await tx.documentRevision.create({data:{chapterId:created.id,sequence:0,content,text:'',contentHash:createHash('sha256').update(JSON.stringify(content)).digest('hex'),authorId:user.id}});
      return {id:created.id,title:created.title};
    });
    return Response.json({chapter},{status:201});
  }catch{return errorResponse('CHAPTER_CREATE_FAILED',503);}
}
