import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse} from '@/lib/security';
import {savedBookOutlinePage,validSavedOutlineQuery} from '@/lib/saved-book-outline';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string}>};

/** Fetch only heading titles from the latest saved revision of an active chapter.
 * Never returns full ProseMirror JSON or unsaved drafts. */
export async function GET(req:Request,{params}:Ctx){
 const user=await activeUser();
 if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,chapterId}=await params;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
 if(!uuid.test(bookId)||!uuid.test(chapterId))return errorResponse('NOT_FOUND',404);
 const url=new URL(req.url);
 const keys=[...url.searchParams.keys()];
 if(keys.some(key=>key!=='filter'&&key!=='offset')||new Set(keys).size!==keys.length)
  return errorResponse('OUTLINE_QUERY_INVALID',400);
 const filter=url.searchParams.get('filter')??'';
 const rawOffset=url.searchParams.get('offset')??'0';
 if(!/^(0|[1-9]\d*)$/u.test(rawOffset))return errorResponse('OUTLINE_QUERY_INVALID',400);
 const offset=Number(rawOffset);
 if(!validSavedOutlineQuery(filter,offset))return errorResponse('OUTLINE_QUERY_INVALID',400);
 try{
  const book=await accessToBook(bookId,user.id);
  const chapter=book?.editions[0]?.manuscript?.chapters.find(c=>c.id===chapterId);
  if(!chapter)return errorResponse('NOT_FOUND',404);
  const revision=await prisma.documentRevision.findUnique({
   where:{chapterId_sequence:{chapterId,sequence:chapter.revisionSeq}},
   select:{content:true}
  });
  if(!revision)return errorResponse('REVISION_MISSING',503);
  return Response.json({chapterId,revision:chapter.revisionSeq,
   ...savedBookOutlinePage(revision.content,filter,offset)},
   {headers:{'Cache-Control':'private, no-store'}});
 }catch{return errorResponse('BOOK_OUTLINE_UNAVAILABLE',503);}
}
