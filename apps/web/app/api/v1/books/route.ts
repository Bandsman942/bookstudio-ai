import {prisma} from '@bookstudio/database';
import {normalizeTitle,emptyDocument} from '@bookstudio/domain';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {createHash} from 'node:crypto';
import {listAccessibleBooks,parseLibraryFilters,LibraryQueryError} from '@/lib/library-books';
export async function GET(req:Request) {
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  let filters;
  try{filters=parseLibraryFilters(new URL(req.url).searchParams);}
  catch{return errorResponse('LIBRARY_FILTER_INVALID',400);}
  try{
    const result=await listAccessibleBooks(user.id,filters);
    return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof LibraryQueryError)return errorResponse('LIBRARY_FILTER_INVALID',400);
    return errorResponse('LIBRARY_LIST_UNAVAILABLE',503);
  }
}
export async function POST(req:Request){
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const payload=await req.json().catch(()=>null);let title:string;
  try{title=normalizeTitle(payload?.title);}catch{return errorResponse('TITLE_INVALID');}
  const type=typeof payload?.bookType==='string'&&['GENERAL','NOVEL','SCIENCE','MEDICINE','EDUCATION','ESSAY'].includes(payload.bookType)?payload.bookType:'GENERAL';
  const lang=typeof payload?.language==='string'&&/^[a-z]{2}(-[A-Z]{2})?$/.test(payload.language)?payload.language:'fr';
  const membership=await prisma.membership.findFirst({where:{userId:user.id,role:{in:['OWNER','EDITOR']}},orderBy:{createdAt:'asc'}});
  if(!membership)return errorResponse('WORKSPACE_NOT_FOUND',409);
  const book=await prisma.$transaction(async tx=>{
    const created=await tx.book.create({data:{workspaceId:membership.workspaceId,ownerId:user.id,title,bookType:type,language:lang}});
    const edition=await tx.edition.create({data:{bookId:created.id,number:1,language:lang}});
    const manuscript=await tx.manuscript.create({data:{editionId:edition.id}});
    const chapter=await tx.chapter.create({data:{manuscriptId:manuscript.id,title:lang==='en'?'Chapter 1':'Chapitre 1',position:0}});
    const content=emptyDocument(),text='';
    const hash=createHash('sha256').update(JSON.stringify(content)).digest('hex');
    await tx.documentRevision.create({data:{chapterId:chapter.id,sequence:0,content,text,contentHash:hash,authorId:user.id}});
    await tx.auditEvent.create({data:{actorId:user.id,workspaceId:membership.workspaceId,subjectId:created.id,action:'BOOK_CREATED'}});
    return {id:created.id,title:created.title,chapterId:chapter.id};
  });
  return Response.json({book},{status:201});
}
