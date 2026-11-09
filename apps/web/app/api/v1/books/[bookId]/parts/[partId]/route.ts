import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {normalizeTitle} from '@bookstudio/domain';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;partId:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function mutate(req:Request,context:Ctx,deletion:boolean){
 if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
 if(Number(req.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,partId}=await context.params;
 if(!uuid.test(partId))return errorResponse('NOT_FOUND',404);
 const book=await accessToBook(bookId,user.id,true),manuscriptId=book?.editions[0]?.manuscript?.id;
 if(!book||!manuscriptId)return errorResponse('NOT_FOUND',404);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body)||
  typeof body.expectedUpdatedAt!=='string'||!uuid.test(body.expectedEditionId??'')||
  (deletion?(Object.keys(body).length!==3||body.confirm!=='DELETE_EMPTY_PART'):
    Object.keys(body).length!==3))return errorResponse('VALIDATION_ERROR',400);
 const expected=new Date(body.expectedUpdatedAt);
 if(!Number.isFinite(expected.getTime()))return errorResponse('VALIDATION_ERROR',400);
 let title='';
 if(!deletion){try{title=normalizeTitle(body.title);}catch{return errorResponse('TITLE_INVALID',400);}}
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
   const existing=await tx.manuscriptPart.findFirst({where:{id:partId,manuscriptId},
    select:{title:true,updatedAt:true}});
   if(!existing)return {status:'NOT_FOUND'} as const;
   if(existing.updatedAt.getTime()!==expected.getTime())return {status:'CONFLICT'} as const;
   if(deletion){
    const assigned=await tx.chapter.count({where:{manuscriptId,partId}});
    if(assigned)return {status:'NOT_EMPTY'} as const;
    const removed=await tx.manuscriptPart.deleteMany({where:{id:partId,manuscriptId,
     updatedAt:expected}});
    if(removed.count!==1)throw Error('PART_CONFLICT');
    await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
     subjectId:partId,action:'MANUSCRIPT_PART_DELETED_EMPTY',metadata:{bookId,title:existing.title}}});
   }else{
    const updated=await tx.manuscriptPart.updateMany({where:{id:partId,manuscriptId,
     updatedAt:expected},data:{title}});
    if(updated.count!==1)throw Error('PART_CONFLICT');
    await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
     subjectId:partId,action:'MANUSCRIPT_PART_RENAMED',metadata:{bookId,from:existing.title,to:title}}});
   }
   await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
   return {status:'OK'} as const;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:6000,timeout:12000});
  if(result.status==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
  if(result.status==='CONFLICT')return errorResponse('BOOK_PART_CONFLICT',409);
  if(result.status==='NOT_EMPTY')return errorResponse('BOOK_PART_NOT_EMPTY',409);
  return Response.json({ok:true,deleted:deletion},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){
  if(['P2002','P2003','P2034'].includes((e as {code?:string})?.code??'')||
    (e instanceof Error&&e.message==='PART_CONFLICT'))return errorResponse('BOOK_PART_CONFLICT',409);
  return errorResponse('BOOK_PART_UPDATE_FAILED',503);
 }
}
export async function PATCH(req:Request,context:Ctx){return mutate(req,context,false);}
export async function DELETE(req:Request,context:Ctx){return mutate(req,context,true);}
