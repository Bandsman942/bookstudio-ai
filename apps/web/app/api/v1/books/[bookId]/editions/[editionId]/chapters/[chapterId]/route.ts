import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {errorResponse} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;editionId:string;chapterId:string}>};
const headers={'Cache-Control':'private, no-store'};

/**
 * Read-only historical preview: no PATCH/DELETE routes exist for prior
 * edition snapshots. Content is returned as plain text, never HTML.
 */
export async function GET(_req:Request,{params}:Ctx){
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,editionId,chapterId}=await params;
 try{
   const chapter=await prisma.chapter.findFirst({
     where:{id:chapterId,deletedAt:null,
       manuscript:{edition:{id:editionId,bookId,
         book:{archivedAt:null,workspace:{
           memberships:{some:{userId:user.id}}
         }}}}},
     select:{id:true,title:true,revisionSeq:true,
       revisions:{orderBy:{sequence:'desc'},take:1,
         select:{sequence:true,text:true,createdAt:true}}
     }
   });
   if(!chapter)return errorResponse('NOT_FOUND',404);
   const last=chapter.revisions[0];
   if(!last)return errorResponse('EDITION_SOURCE_INVALID',409);
   return Response.json({chapter:{id:chapter.id,title:chapter.title,
     revision:last.sequence,text:last.text,recordedAt:last.createdAt
   }},{headers});
 }catch{return errorResponse('EDITION_READ_UNAVAILABLE',503);}
}
