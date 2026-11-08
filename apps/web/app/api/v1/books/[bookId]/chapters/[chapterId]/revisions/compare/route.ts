import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {errorResponse} from '@/lib/security';
import {compareSavedRevisionText} from '@/lib/chapter-revision-diff';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string}>};
const HEADERS={'Cache-Control':'private, no-store'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEQUENCE=/^(0|[1-9][0-9]{0,8})$/;

/** Compare two immutable revision texts of one active chapter. Read only,
 * tenant-authorized, without HTML, AI transfer, content hashes or source URLs. */
export async function GET(request:Request,{params}:Ctx){
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,chapterId}=await params;
 const query=new URL(request.url).searchParams;
 const fromRaw=query.get('from'),toRaw=query.get('to');
 if(!UUID.test(bookId)||!UUID.test(chapterId)||
    [...query.keys()].some(k=>k!=='from'&&k!=='to')||
    query.getAll('from').length!==1||query.getAll('to').length!==1||
    !fromRaw||!toRaw||!SEQUENCE.test(fromRaw)||!SEQUENCE.test(toRaw)||
    fromRaw===toRaw)
   return errorResponse('REVISION_COMPARISON_INVALID',400);
 const from=Number(fromRaw),to=Number(toRaw);
 try{
   const edition=await prisma.edition.findFirst({
     where:{bookId,book:{archivedAt:null,
       workspace:{memberships:{some:{userId:user.id}}}}},
     orderBy:{number:'desc'},
     select:{manuscript:{select:{chapters:{
       where:{id:chapterId,deletedAt:null},
       select:{id:true,revisionSeq:true}
     }}}}
   });
   const chapter=edition?.manuscript?.chapters[0];
   if(!chapter)return errorResponse('NOT_FOUND',404);
   if(from>chapter.revisionSeq||to>chapter.revisionSeq)
     return errorResponse('NOT_FOUND',404);
   const rows=await prisma.documentRevision.findMany({
     where:{chapterId,sequence:{in:[from,to]}},
     select:{sequence:true,text:true,contentHash:true,createdAt:true,
       author:{select:{name:true}}}
   });
   if(rows.length!==2)return errorResponse('REVISION_COMPARISON_SOURCE_INVALID',409);
   const a=rows.find(r=>r.sequence===from),b=rows.find(r=>r.sequence===to);
   if(!a||!b)return errorResponse('REVISION_COMPARISON_SOURCE_INVALID',409);
   const diff=compareSavedRevisionText(a.text,b.text,a.contentHash,b.contentHash);
   return Response.json({chapterId,
     from:{sequence:a.sequence,createdAt:a.createdAt,authorName:a.author.name},
     to:{sequence:b.sequence,createdAt:b.createdAt,authorName:b.author.name},
     comparison:diff},{headers:HEADERS});
 }catch(error){
   if(error instanceof Error&&error.message==='REVISION_COMPARISON_TOO_LARGE')
     return errorResponse('REVISION_COMPARISON_TOO_LARGE',422);
   if(error instanceof Error&&error.message==='REVISION_COMPARISON_SOURCE_INVALID')
     return errorResponse('REVISION_COMPARISON_SOURCE_INVALID',409);
   return errorResponse('REVISION_COMPARISON_UNAVAILABLE',503);
 }
}
