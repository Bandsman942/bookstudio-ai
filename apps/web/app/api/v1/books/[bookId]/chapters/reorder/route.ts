import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {activeUser,accessToBook} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';
import {chapterOrderToken,nextChapterOrder} from '@/lib/chapter-order';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validHash=/^[0-9a-f]{64}$/i;
type Ctx={params:Promise<{bookId:string}>};

export async function PATCH(request:Request,{params}:Ctx){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(Number(request.headers.get('content-length')||0)>1024)
    return errorResponse('VALIDATION_ERROR',413);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId}=await params,book=await accessToBook(bookId,user.id,true);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!book||!manuscriptId)return errorResponse('NOT_FOUND',404);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).length!==3||
    !validUuid.test(body.chapterId??'')||
    !['up','down'].includes(body.direction)||
    typeof body.expectedOrderToken!=='string'||!validHash.test(body.expectedOrderToken))
    return errorResponse('CHAPTER_ORDER_INVALID',400);
  try{
    const result=await prisma.$transaction(async tx=>{
      // Permissions are revalidated inside the serializable transaction.
      const member=await tx.membership.findFirst({where:{
        userId:user.id,workspaceId:book.workspaceId,role:{in:['OWNER','EDITOR']}
      },select:{id:true}});
      const liveBook=await tx.book.findFirst({where:{
        id:bookId,workspaceId:book.workspaceId,archivedAt:null
      },select:{id:true}});
      if(!member||!liveBook)return {status:'NOT_FOUND'} as const;
      const rows=await tx.chapter.findMany({where:{manuscriptId,deletedAt:null},
        orderBy:[{position:'asc'},{id:'asc'}],
        select:{id:true,position:true}});
      if(rows.length>2000)return {status:'TOO_LARGE'} as const;
      if(chapterOrderToken(rows)!==body.expectedOrderToken)
        return {status:'CONFLICT'} as const;
      const proposed=nextChapterOrder(rows,body.chapterId,body.direction);
      if(!proposed)return {status:'NOT_FOUND'} as const;
      if(proposed.every((c,i)=>c.id===rows[i].id))
        return {status:'OK',changed:false,orderToken:chapterOrderToken(rows)} as const;
      // The database enforces UNIQUE(manuscript_id, position), including
      // soft-deleted chapters. A direct swap violates that constraint even
      // inside one transaction: park one row in a free temporary position.
      const source=rows.find(c=>c.id===body.chapterId)!;
      // The position now occupied by the moved chapter in the proposed order
      // belonged to its neighbour in the original order.
      const oldIndex=rows.findIndex(c=>c.id===source.id);
      const neighbour=rows[oldIndex+(body.direction==='up'?-1:1)];
      if(!neighbour||source.position===neighbour.position)
        throw Error('CHAPTER_ORDER_CONFLICT');
      const max=await tx.chapter.aggregate({where:{manuscriptId},_max:{position:true}});
      const temporary=(max._max.position??-1)+1;
      if(!Number.isSafeInteger(temporary)||temporary>2147483647)
        return {status:'TOO_LARGE'} as const;
      const park=await tx.chapter.updateMany({where:{
        id:source.id,manuscriptId,deletedAt:null,position:source.position
      },data:{position:temporary}});
      if(park.count!==1)throw Error('CHAPTER_ORDER_CONFLICT');
      const shift=await tx.chapter.updateMany({where:{
        id:neighbour.id,manuscriptId,deletedAt:null,position:neighbour.position
      },data:{position:source.position}});
      if(shift.count!==1)throw Error('CHAPTER_ORDER_CONFLICT');
      const finish=await tx.chapter.updateMany({where:{
        id:source.id,manuscriptId,deletedAt:null,position:temporary
      },data:{position:neighbour.position}});
      if(finish.count!==1)throw Error('CHAPTER_ORDER_CONFLICT');
      await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
      await tx.auditEvent.create({data:{
        actorId:user.id,workspaceId:book.workspaceId,subjectId:body.chapterId,
        action:'CHAPTER_REORDERED',metadata:{
          bookId,direction:body.direction,
          from:rows.findIndex(c=>c.id===body.chapterId),
          to:proposed.findIndex(c=>c.id===body.chapterId)
        }
      }});
      const final=proposed.map((c,index)=>({id:c.id,position:rows[index].position}));
      return {status:'OK',changed:true,orderToken:chapterOrderToken(final)} as const;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:7000,timeout:12000});
    if(result.status==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(result.status==='CONFLICT')return errorResponse('CHAPTER_ORDER_CONFLICT',409);
    if(result.status==='TOO_LARGE')return errorResponse('CHAPTER_ORDER_TOO_LARGE',422);
    return Response.json({ok:true,changed:result.changed,orderToken:result.orderToken},
      {headers:{'Cache-Control':'private, no-store'}});
  }catch(e){
    if(['P2034','P2002'].includes((e as {code?:string})?.code??'')||
       (e instanceof Error&&e.message==='CHAPTER_ORDER_CONFLICT'))
      return errorResponse('CHAPTER_ORDER_CONFLICT',409);
    return errorResponse('CHAPTER_REORDER_FAILED',503);
  }
}
