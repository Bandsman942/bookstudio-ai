import {Prisma,type BookStatus} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {normalizeTitle,transitionAllowed} from '@bookstudio/domain';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
type Action='rename'|'archive'|'restore'|'properties'|'status';
const types=['GENERAL','NOVEL','ESSAY','SCIENCE','MEDICINE','EDUCATION'] as const;
const stages=['DRAFT','WRITING','REVIEW','APPROVED','PRODUCTION','PUBLISHED'] as const;
const noStore={'Cache-Control':'private, no-store'};

export async function PATCH(request:Request,{params}:Ctx){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  if(Number(request.headers.get('content-length')||0)>4096)
    return errorResponse('VALIDATION_ERROR',413);
  const {bookId}=await params;
  const input=await request.json().catch(()=>null);
  if(!input||typeof input!=='object'||Array.isArray(input)||
    !['rename','archive','restore','properties','status'].includes(input.action)||
    typeof input.expectedUpdatedAt!=='string')return errorResponse('VALIDATION_ERROR',400);
  const action=input.action as Action;
  const expected=new Date(input.expectedUpdatedAt);
  if(!Number.isFinite(expected.getTime()))return errorResponse('VALIDATION_ERROR',400);

  let title:string|undefined,bookType:string|undefined,language:string|undefined,
      nextStatus:BookStatus|undefined;
  if(action==='rename'){
    try{title=normalizeTitle(input.title);}catch{return errorResponse('TITLE_INVALID',400);}
  }
  if(action==='properties'){
    if(typeof input.bookType!=='string'||!types.includes(input.bookType as typeof types[number])||
       typeof input.language!=='string'||!['fr','en'].includes(input.language))
      return errorResponse('BOOK_PROPERTIES_INVALID',400);
    bookType=input.bookType;language=input.language;
  }
  if(action==='status'){
    if(typeof input.status!=='string'||
       !stages.includes(input.status as typeof stages[number]))
      return errorResponse('BOOK_STATUS_INVALID',400);
    nextStatus=input.status as BookStatus;
  }

  try{
    const output=await prisma.$transaction(async tx=>{
      // Session, membership, workspace, archive and version are verified again
      // within the same serializable transaction as the metadata mutation.
      const book=await tx.book.findFirst({
        where:{id:bookId,workspace:{memberships:{some:{
          userId:user.id,role:{in:['OWNER','EDITOR']}
        }}}},
        select:{id:true,workspaceId:true,title:true,bookType:true,language:true,
          status:true,updatedAt:true,archivedAt:true}
      });
      if(!book)return {kind:'NOT_FOUND'} as const;
      if(book.updatedAt.getTime()!==expected.getTime())
        return {kind:'CONFLICT'} as const;
      if(action==='archive'&&book.archivedAt!==null)
        return {kind:'CONFLICT'} as const;
      if(action==='restore'&&book.archivedAt===null)
        return {kind:'CONFLICT'} as const;
      if(['rename','properties','status'].includes(action)&&book.archivedAt!==null)
        return {kind:'NOT_FOUND'} as const;

      if(action==='status'){
        if(book.status===nextStatus)
          return {kind:'UNCHANGED',updatedAt:book.updatedAt} as const;
        // ARCHIVED is a separate lifecycle operation, never a status choice.
        // PUBLISHED is only a manual editorial milestone, not a platform publish.
        if(!nextStatus||nextStatus==='ARCHIVED'||
           !transitionAllowed(book.status,nextStatus))
          return {kind:'INVALID_TRANSITION'} as const;
      }
      if(action==='rename'&&book.title===title)
        return {kind:'UNCHANGED',updatedAt:book.updatedAt} as const;
      if(action==='properties'&&book.bookType===bookType&&book.language===language)
        return {kind:'UNCHANGED',updatedAt:book.updatedAt} as const;

      const data:Prisma.BookUpdateManyMutationInput=action==='rename'?{title}:
        action==='archive'?{archivedAt:new Date()}:
        action==='restore'?{archivedAt:null}:
        action==='properties'?{bookType,language}:{status:nextStatus};
      const updated=await tx.book.updateMany({
        where:{id:bookId,workspaceId:book.workspaceId,updatedAt:expected},data
      });
      if(updated.count!==1)throw new Error('CONCURRENT_BOOK_CHANGE');
      const saved=await tx.book.findUniqueOrThrow({where:{id:bookId},
        select:{id:true,title:true,bookType:true,language:true,status:true,
          updatedAt:true,archivedAt:true}});
      const auditAction:Record<Action,string>={
        rename:'BOOK_RENAMED',archive:'BOOK_ARCHIVED',restore:'BOOK_RESTORED',
        properties:'BOOK_PROPERTIES_UPDATED',status:'BOOK_STATUS_CHANGED'
      };
      const metadata=action==='rename'?{previousTitle:book.title,newTitle:title}:
        action==='properties'?{previousType:book.bookType,nextType:bookType,
          previousLanguage:book.language,nextLanguage:language}:
        action==='status'?{previousStatus:book.status,nextStatus}:undefined;
      await tx.auditEvent.create({data:{
        actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
        action:auditAction[action],metadata
      }});
      return {kind:'OK',book:saved} as const;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:10000});
    if(output.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(output.kind==='CONFLICT')return errorResponse('BOOK_CONFLICT',409);
    if(output.kind==='INVALID_TRANSITION')return errorResponse('BOOK_STATUS_TRANSITION_INVALID',422);
    if(output.kind==='UNCHANGED')
      return Response.json({ok:true,unchanged:true,updatedAt:output.updatedAt},{headers:noStore});
    return Response.json({ok:true,book:output.book},{headers:noStore});
  }catch(error){
    if(error instanceof Error&&(error.message==='CONCURRENT_BOOK_CHANGE'||
       (error as {code?:string}).code==='P2034'))
      return errorResponse('BOOK_CONFLICT',409);
    return errorResponse('BOOK_UPDATE_FAILED',503);
  }
}
