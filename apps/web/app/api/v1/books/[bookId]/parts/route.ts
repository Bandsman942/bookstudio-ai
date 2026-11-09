import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {normalizeTitle} from '@bookstudio/domain';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';
import {orderPartsByChapters} from '@/lib/book-parts';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function GET(_req:Request,{params}:Ctx){
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId}=await params,book=await accessToBook(bookId,user.id);
 const manuscriptId=book?.editions[0]?.manuscript?.id;
 if(!manuscriptId)return errorResponse('NOT_FOUND',404);
 try{
  const parts=await prisma.manuscriptPart.findMany({where:{manuscriptId},
   orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,title:true,updatedAt:true}});
  return Response.json({editionId:book.editions[0].id,
   parts:orderPartsByChapters(parts,book.editions[0].manuscript?.chapters??[])},
   {headers:{'Cache-Control':'private, no-store'}});
 }catch{return errorResponse('BOOK_PARTS_UNAVAILABLE',503);}
}

export async function POST(req:Request,{params}:Ctx){
 if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
 if(Number(req.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId}=await params,book=await accessToBook(bookId,user.id,true);
 const manuscriptId=book?.editions[0]?.manuscript?.id;
 if(!book||!manuscriptId)return errorResponse('NOT_FOUND',404);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).length!==2||!uuid.test(body.expectedEditionId??''))
  return errorResponse('VALIDATION_ERROR',400);
 let title:string;
 try{title=normalizeTitle(body.title);}catch{return errorResponse('TITLE_INVALID',400);}
 try{
  const result=await prisma.$transaction(async tx=>{
   const lock=await tx.$queryRaw<{id:string}[]>`
     SELECT id::text FROM books WHERE id=${bookId}::uuid AND archived_at IS NULL FOR UPDATE`;
   if(!lock.length)return {status:'NOT_FOUND'} as const;
   const [member,current]=await Promise.all([
    tx.membership.findFirst({where:{userId:user.id,workspaceId:book.workspaceId,
      role:{in:['OWNER','EDITOR']}},select:{id:true}}),
    tx.edition.findFirst({where:{bookId},orderBy:{number:'desc'},
      select:{id:true,manuscript:{select:{id:true}}}})
   ]);
   if(!member)return {status:'NOT_FOUND'} as const;
   if(current?.id!==body.expectedEditionId||current?.manuscript?.id!==manuscriptId)
    return {status:'CONFLICT'} as const;
   const count=await tx.manuscriptPart.count({where:{manuscriptId}});
   if(count>=100)return {status:'TOO_LARGE'} as const;
   const part=await tx.manuscriptPart.create({data:{manuscriptId,title},
     select:{id:true,title:true,updatedAt:true}});
   await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
   await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
    subjectId:part.id,action:'MANUSCRIPT_PART_CREATED',metadata:{bookId,title}}});
   return {status:'OK',part} as const;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:6000,timeout:12000});
  if(result.status==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
  if(result.status==='CONFLICT')return errorResponse('BOOK_PART_EDITION_CONFLICT',409);
  if(result.status==='TOO_LARGE')return errorResponse('BOOK_PART_LIMIT',422);
  return Response.json({part:result.part},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(e){
  if(['P2002','P2034'].includes((e as {code?:string})?.code??''))
   return errorResponse('BOOK_PART_CONFLICT',409);
  return errorResponse('BOOK_PART_CREATE_FAILED',503);
 }
}
