import { prisma } from '@bookstudio/database';
import { normalizeTitle } from '@bookstudio/domain';
import { activeUser } from '@/lib/auth';
import { isSameOrigin, errorResponse } from '@/lib/security';

export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};

/** Strictly controlled book metadata actions; no irreversible deletion. */
export async function PATCH(request:Request,{params}:Ctx){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  if(Number(request.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
  const {bookId}=await params;
  const input=await request.json().catch(()=>null);
  if(!input||!['rename','archive','restore'].includes(input.action)||
    typeof input.expectedUpdatedAt!=='string')return errorResponse('VALIDATION_ERROR',400);
  const expected=new Date(input.expectedUpdatedAt);
  if(Number.isNaN(expected.getTime()))return errorResponse('VALIDATION_ERROR',400);
  let title:string|undefined;
  if(input.action==='rename'){
    try{title=normalizeTitle(input.title);}catch{return errorResponse('TITLE_INVALID',400);}
  }
  try{
    const output=await prisma.$transaction(async tx=>{
      const book=await tx.book.findFirst({
        where:{id:bookId,workspace:{memberships:{some:{userId:user.id,role:{in:['OWNER','EDITOR']}}}}},
        select:{id:true,workspaceId:true,title:true,updatedAt:true,archivedAt:true}
      });
      if(!book)return {kind:'NOT_FOUND'} as const;
      if(book.updatedAt.getTime()!==expected.getTime())return {kind:'CONFLICT'} as const;
      if(input.action==='archive'&&book.archivedAt!==null)return {kind:'CONFLICT'} as const;
      if(input.action==='restore'&&book.archivedAt===null)return {kind:'CONFLICT'} as const;
      if(input.action==='rename'&&book.archivedAt!==null)return {kind:'NOT_FOUND'} as const;
      if(input.action==='rename'&&book.title===title)return {kind:'UNCHANGED',updatedAt:book.updatedAt} as const;
      const data=input.action==='rename'?{title}:
        input.action==='archive'?{archivedAt:new Date()}:{archivedAt:null};
      const result=await tx.book.updateMany({where:{id:bookId,updatedAt:book.updatedAt},data});
      if(result.count!==1)throw new Error('CONCURRENT_BOOK_CHANGE');
      const saved=await tx.book.findUniqueOrThrow({where:{id:bookId},select:{id:true,title:true,updatedAt:true,archivedAt:true}});
      await tx.auditEvent.create({data:{
        actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
        action:input.action==='rename'?'BOOK_RENAMED':input.action==='archive'?'BOOK_ARCHIVED':'BOOK_RESTORED',
        metadata:input.action==='rename'?{previousTitle:book.title,newTitle:title}:undefined
      }});
      return {kind:'OK',book:saved} as const;
    },{isolationLevel:'Serializable'});
    if(output.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(output.kind==='CONFLICT')return errorResponse('BOOK_CONFLICT',409);
    if(output.kind==='UNCHANGED')return Response.json({ok:true,unchanged:true,updatedAt:output.updatedAt},{headers:{'Cache-Control':'no-store'}});
    return Response.json({ok:true,book:output.book},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof Error && (error.message==='CONCURRENT_BOOK_CHANGE'||(error as {code?:string}).code==='P2034'))return errorResponse('BOOK_CONFLICT',409);
    return errorResponse('BOOK_UPDATE_FAILED',503);
  }
}
