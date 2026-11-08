import {activeUser} from '@/lib/auth';
import {getBookProgress} from '@/lib/book-progress';
import {errorResponse} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};

/** Private, read-only progress summary, including current/latest chapter revision only. */
export async function GET(_req:Request,{params}:Ctx){
 const user=await activeUser();
 if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId}=await params;
 try{
   const progress=await getBookProgress(bookId,user.id);
   if(!progress)return errorResponse('NOT_FOUND',404);
   return Response.json({progress},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return errorResponse('BOOK_PROGRESS_UNAVAILABLE',503);}
}
