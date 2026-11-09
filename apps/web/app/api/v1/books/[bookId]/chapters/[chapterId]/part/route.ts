import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';
import {assignChapterPart} from '@/lib/book-parts';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;chapterId:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function PATCH(req:Request,{params}:Ctx){
 if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
 if(Number(req.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,chapterId}=await params,book=await accessToBook(bookId,user.id,true);
 const manuscriptId=book?.editions[0]?.manuscript?.id;
 if(!book||!manuscriptId||!book.editions[0].manuscript?.chapters.some(c=>c.id===chapterId))
  return errorResponse('NOT_FOUND',404);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).length!==3||!uuid.test(body.expectedEditionId??'')||
   !(body.partId===null||typeof body.partId==='string'&&uuid.test(body.partId))||
   typeof body.expectedChapterUpdatedAt!=='string')return errorResponse('VALIDATION_ERROR',400);
 const expected=new Date(body.expectedChapterUpdatedAt);
 if(!Number.isFinite(expected.getTime()))return errorResponse('VALIDATION_ERROR',400);
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
   if(body.partId){
    const part=await tx.manuscriptPart.findFirst({where:{id:body.partId,manuscriptId},
     select:{id:true}});
    if(!part)return {status:'NOT_FOUND'} as const;
   }
   const rows=await tx.chapter.findMany({where:{manuscriptId,deletedAt:null},
    orderBy:[{position:'asc'},{id:'asc'}],
    select:{id:true,partId:true,position:true,updatedAt:true}});
   if(rows.length>2000)return {status:'TOO_LARGE'} as const;
   const source=rows.find(c=>c.id===chapterId);
   if(!source)return {status:'NOT_FOUND'} as const;
   if(source.updatedAt.getTime()!==expected.getTime())return {status:'CONFLICT'} as const;
   if(source.partId===body.partId)return {status:'OK',changed:false} as const;
   if(!assignChapterPart(rows,chapterId,body.partId))return {status:'NOT_CONTIGUOUS'} as const;
   const changed=await tx.chapter.updateMany({where:{id:chapterId,manuscriptId,
    deletedAt:null,updatedAt:expected},data:{partId:body.partId}});
   if(changed.count!==1)throw Error('PART_CONFLICT');
   await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
   await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
    subjectId:chapterId,action:'CHAPTER_PART_CHANGED',metadata:{bookId,
     fromPartId:source.partId,toPartId:body.partId}}});
   return {status:'OK',changed:true} as const;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:6000,timeout:12000});
  if(result.status==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
  if(result.status==='CONFLICT')return errorResponse('BOOK_PART_CONFLICT',409);
  if(result.status==='TOO_LARGE')return errorResponse('BOOK_PART_TOO_LARGE',422);
  if(result.status==='NOT_CONTIGUOUS')return errorResponse('BOOK_PART_NOT_CONTIGUOUS',409);
  return Response.json({ok:true,changed:result.changed},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){
  if(['P2002','P2034'].includes((e as {code?:string})?.code??'')||
    (e instanceof Error&&e.message==='PART_CONFLICT'))return errorResponse('BOOK_PART_CONFLICT',409);
  return errorResponse('BOOK_PART_ASSIGN_FAILED',503);
 }
}
