import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {errorResponse} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;editionId:string}>};
const headers={'Cache-Control':'private, no-store'};

/** Inventory only: earlier editions are never writable through this API. */
export async function GET(_req:Request,{params}:Ctx){
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,editionId}=await params;
 try{
   const edition=await prisma.edition.findFirst({
     where:{id:editionId,bookId,
       book:{archivedAt:null,workspace:{memberships:{some:{userId:user.id}}}}},
     select:{id:true,number:true,language:true,
       manuscript:{select:{chapters:{
         where:{deletedAt:null},orderBy:[{position:'asc'},{id:'asc'}],
         select:{id:true,title:true,position:true,revisionSeq:true,
           updatedAt:true}
       }}}
     }
   });
   if(!edition)return errorResponse('NOT_FOUND',404);
   return Response.json({edition:{
     id:edition.id,number:edition.number,language:edition.language,
     chapters:edition.manuscript?.chapters??[]
   }},{headers});
 }catch{return errorResponse('EDITION_READ_UNAVAILABLE',503);}
}
