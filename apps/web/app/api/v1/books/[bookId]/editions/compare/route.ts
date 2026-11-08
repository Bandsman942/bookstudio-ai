import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {errorResponse} from '@/lib/security';
import {compareEditionFingerprints,type ChapterFingerprint} from '@/lib/edition-diff';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
const headers={'Cache-Control':'private, no-store'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CHAPTERS_PER_EDITION=350;

/**
 * Compare latest saved fingerprint of active chapters in two editions.
 * Authorization is checked before reading any metadata or revisions.
 * No manuscript prose, content JSON, signed URLs, or hashes leave the API.
 */
export async function GET(request:Request,{params}:Ctx){
 const user=await activeUser();
 if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId}=await params;
 const search=new URL(request.url).searchParams;
 const from=search.get('from'),to=search.get('to');
 if(!from||!to||!UUID.test(from)||!UUID.test(to)||from===to)
   return errorResponse('EDITION_COMPARISON_INVALID',400);
 try{
   const book=await prisma.book.findFirst({
     where:{id:bookId,archivedAt:null,workspace:{memberships:{some:{userId:user.id}}}},
     select:{id:true}
   });
   if(!book)return errorResponse('NOT_FOUND',404);
   const editions=await prisma.edition.findMany({
     where:{bookId,id:{in:[from,to]}},
     select:{id:true,number:true,manuscript:{select:{id:true}}}
   });
   if(editions.length!==2||editions.some(e=>!e.manuscript))
     return errorResponse('NOT_FOUND',404);
   const first=editions.find(e=>e.id===from)!;
   const second=editions.find(e=>e.id===to)!;
   const firstId=first.manuscript!.id,secondId=second.manuscript!.id;
   const [countLeft,countRight]=await Promise.all([
     prisma.chapter.count({where:{manuscriptId:firstId,deletedAt:null}}),
     prisma.chapter.count({where:{manuscriptId:secondId,deletedAt:null}})
   ]);
   if(countLeft>MAX_CHAPTERS_PER_EDITION||countRight>MAX_CHAPTERS_PER_EDITION)
     return errorResponse('EDITION_COMPARISON_TOO_LARGE',422);
   const chapters=await prisma.chapter.findMany({
     where:{manuscriptId:{in:[firstId,secondId]},deletedAt:null},
     orderBy:[{position:'asc'},{id:'asc'}],
     select:{id:true,title:true,position:true,manuscriptId:true,
       revisions:{orderBy:{sequence:'desc'},take:1,select:{contentHash:true}}}
   });
   if(chapters.length!==countLeft+countRight||
     chapters.some(c=>c.revisions.length!==1))
     return errorResponse('EDITION_COMPARISON_SOURCE_INVALID',409);
   const fingerprints=(id:string):ChapterFingerprint[]=>chapters
     .filter(c=>c.manuscriptId===id)
     .map(c=>({id:c.id,title:c.title,position:c.position,
       contentHash:c.revisions[0].contentHash}));
   return Response.json({
     fromEdition:{id:first.id,number:first.number},
     toEdition:{id:second.id,number:second.number},
     comparison:compareEditionFingerprints(fingerprints(firstId),fingerprints(secondId))
   },{headers});
 }catch{return errorResponse('EDITION_COMPARISON_UNAVAILABLE',503);}
}
