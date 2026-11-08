import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {errorResponse} from '@/lib/security';
import {parseChapterTargetSearch,CHAPTER_COPY_TARGET_PAGE_SIZE} from '@/lib/chapter-copy-targets';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Discover ONLY writable, active destination books from the exact source
 * workspace. A bounded title query lets large libraries narrow results. */
export async function GET(request:Request,{params}:Ctx){
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId}=await params;
 let search:string;
 try{
   if(!UUID.test(bookId))throw Error('CHAPTER_DESTINATION_QUERY_INVALID');
   search=parseChapterTargetSearch(new URL(request.url).searchParams);
 }catch{return errorResponse('CHAPTER_DESTINATION_QUERY_INVALID',400);}
 try{
   const source=await prisma.book.findFirst({where:{
     id:bookId,archivedAt:null,
     workspace:{memberships:{some:{userId:user.id,role:{in:['OWNER','EDITOR']}}}}
   },select:{workspaceId:true}});
   if(!source)return errorResponse('NOT_FOUND',404);
   const books=await prisma.book.findMany({where:{
     workspaceId:source.workspaceId,id:{not:bookId},archivedAt:null,
     ...(search.trim()?{title:{contains:search.trim(),mode:'insensitive' as const}}:{})
   },orderBy:[{title:'asc'},{id:'asc'}],take:CHAPTER_COPY_TARGET_PAGE_SIZE+1,
     select:{id:true,title:true,bookType:true,language:true,status:true}});
   return Response.json({targets:books.slice(0,CHAPTER_COPY_TARGET_PAGE_SIZE),hasMore:books.length>CHAPTER_COPY_TARGET_PAGE_SIZE},
     {headers:{'Cache-Control':'private, no-store'}});
 }catch{return errorResponse('CHAPTER_DESTINATION_LIST_FAILED',503);}
}
