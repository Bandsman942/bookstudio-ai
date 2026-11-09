import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';
import {movePartBlock,partBlockPositionChanges,partMoveToken} from '@/lib/part-move';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string;partId:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256=/^[0-9a-f]{64}$/i;

export async function PATCH(request:Request,{params}:Ctx){
 if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
 if(Number(request.headers.get('content-length')||0)>1024)
  return errorResponse('VALIDATION_ERROR',413);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId,partId}=await params;
 if(!uuid.test(partId))return errorResponse('NOT_FOUND',404);
 const book=await accessToBook(bookId,user.id,true);
 const manuscriptId=book?.editions[0]?.manuscript?.id;
 if(!book||!manuscriptId)return errorResponse('NOT_FOUND',404);
 const body=await request.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).length!==3||!uuid.test(body.expectedEditionId??'')||
   !sha256.test(body.expectedOrderToken??'')||
   !['up','down'].includes(body.direction))
  return errorResponse('VALIDATION_ERROR',400);
 try{
  const result=await prisma.$transaction(async tx=>{
   const lock=await tx.$queryRaw<{id:string}[]>`
     SELECT id::text FROM books WHERE id=${bookId}::uuid AND archived_at IS NULL FOR UPDATE`;
   if(!lock.length)return {status:'NOT_FOUND'} as const;
   const member=await tx.membership.findFirst({where:{userId:user.id,
     workspaceId:book.workspaceId,role:{in:['OWNER','EDITOR']}},select:{id:true}});
   if(!member)return {status:'NOT_FOUND'} as const;
   const edition=await tx.edition.findFirst({where:{bookId},
     orderBy:{number:'desc'},select:{id:true,manuscript:{select:{id:true}}}});
   if(edition?.id!==body.expectedEditionId||edition?.manuscript?.id!==manuscriptId)
    return {status:'CONFLICT'} as const;
   const part=await tx.manuscriptPart.findFirst({where:{id:partId,manuscriptId},
     select:{id:true}});
   if(!part)return {status:'NOT_FOUND'} as const;
   const rows=await tx.chapter.findMany({where:{manuscriptId,deletedAt:null},
     orderBy:[{position:'asc'},{id:'asc'}],
     select:{id:true,position:true,partId:true}});
   if(rows.length>2000)return {status:'TOO_LARGE'} as const;
   if(partMoveToken(rows)!==body.expectedOrderToken)
    return {status:'CONFLICT'} as const;
   const moved=movePartBlock(rows,partId,body.direction);
   if(!moved)return {status:'UNAVAILABLE'} as const;
   const changes=partBlockPositionChanges(rows,moved);
   if(!changes||changes.length===0)return {status:'UNAVAILABLE'} as const;
   // The UNIQUE(manuscript_id, position) index also covers archived rows.
   // First park all affected live rows above the maximum occupied slot,
   // then fill the original active slots. Both phases are one transaction.
   const max=await tx.chapter.aggregate({where:{manuscriptId},_max:{position:true}});
   const highest=max._max.position??-1;
   if(highest+changes.length>2147483647)return {status:'TOO_LARGE'} as const;
   const parkedSlots=Prisma.join(changes.map((change,index)=>Prisma.sql`
     (${change.id}::uuid,${change.from}::integer,${highest+index+1}::integer)`));
   const parked=await tx.$executeRaw(Prisma.sql`
     UPDATE chapters AS chapter SET position=slot.temporary,updated_at=NOW()
     FROM (VALUES ${parkedSlots}) AS slot(id,original,temporary)
     WHERE chapter.id=slot.id AND chapter.manuscript_id=${manuscriptId}::uuid
       AND chapter.deleted_at IS NULL AND chapter.position=slot.original`);
   if(parked!==changes.length)throw Error('PART_MOVE_CONFLICT');
   const finalSlots=Prisma.join(changes.map((change,index)=>Prisma.sql`
     (${change.id}::uuid,${highest+index+1}::integer,${change.to}::integer)`));
   const applied=await tx.$executeRaw(Prisma.sql`
     UPDATE chapters AS chapter SET position=slot.final,updated_at=NOW()
     FROM (VALUES ${finalSlots}) AS slot(id,temporary,final)
     WHERE chapter.id=slot.id AND chapter.manuscript_id=${manuscriptId}::uuid
       AND chapter.deleted_at IS NULL AND chapter.position=slot.temporary`);
   if(applied!==changes.length)throw Error('PART_MOVE_CONFLICT');
   await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
   await tx.auditEvent.create({data:{actorId:user.id,workspaceId:book.workspaceId,
     subjectId:partId,action:'MANUSCRIPT_PART_MOVED',metadata:{bookId,
       direction:body.direction,chaptersMoved:changes.length}}});
   const next=moved.map((c,index)=>({id:c.id,partId:c.partId,
     position:rows[index].position}));
   return {status:'OK',orderToken:partMoveToken(next),changed:changes.length} as const;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:7000,timeout:15000});
  if(result.status==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
  if(result.status==='CONFLICT')return errorResponse('BOOK_PART_ORDER_CONFLICT',409);
  if(result.status==='UNAVAILABLE')return errorResponse('BOOK_PART_MOVE_UNAVAILABLE',409);
  if(result.status==='TOO_LARGE')return errorResponse('BOOK_PART_ORDER_TOO_LARGE',422);
  return Response.json({ok:true,changedChapters:result.changed,
    orderToken:result.orderToken},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){
  if(['P2002','P2034'].includes((e as {code?:string})?.code??'')||
    (e instanceof Error&&e.message==='PART_MOVE_CONFLICT'))
   return errorResponse('BOOK_PART_ORDER_CONFLICT',409);
  return errorResponse('BOOK_PART_MOVE_FAILED',503);
 }
}
