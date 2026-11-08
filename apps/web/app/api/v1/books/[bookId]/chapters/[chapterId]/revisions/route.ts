import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {errorResponse} from '@/lib/security';
import {parseHistoryRequest,takeHistoryPage} from '@/lib/chapter-history';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={'Cache-Control':'private, no-store'};

/** Current-edition chapter revision inventory, metadata only, keyset paginated. */
export async function GET(request:Request,{params}:Ctx){
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,chapterId}=await params;
 if(!UUID.test(bookId)||!UUID.test(chapterId))
   return errorResponse('REVISION_HISTORY_QUERY_INVALID',400);
 let page;
 try{page=parseHistoryRequest(request.url);}
 catch{return errorResponse('REVISION_HISTORY_QUERY_INVALID',400);}
 try{
   const edition=await prisma.edition.findFirst({
     where:{bookId,book:{archivedAt:null,
       workspace:{memberships:{some:{userId:user.id}}}}},
     orderBy:{number:'desc'},
     select:{id:true,manuscript:{select:{chapters:{
       where:{id:chapterId,deletedAt:null},
       select:{id:true,title:true,revisionSeq:true}
     }}}}
   });
   const chapter=edition?.manuscript?.chapters[0];
   if(!chapter)return errorResponse('NOT_FOUND',404);
   const rows=await prisma.documentRevision.findMany({
     where:{chapterId,...(page.before===null?{}:{sequence:{lt:page.before}})},
     orderBy:{sequence:'desc'},take:page.limit+1,
     select:{sequence:true,createdAt:true,author:{select:{name:true}}}
   });
   const result=takeHistoryPage(rows,page.limit);
   return Response.json({
     chapterId,title:chapter.title,currentRevision:chapter.revisionSeq,
     revisions:result.items.map(item=>({sequence:item.sequence,
       createdAt:item.createdAt,authorName:item.author.name})),
     nextBefore:result.nextBefore
   },{headers:HEADERS});
 }catch{return errorResponse('REVISION_HISTORY_UNAVAILABLE',503);}
}
