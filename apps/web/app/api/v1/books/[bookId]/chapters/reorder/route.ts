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
      const duplicates=new Set(rows.map(x=>x.position)).size!==rows.length;
      const changes=duplicates?proposed.map((c,index)=>({id:c.id,old:c.position,next:index}))
        :proposed.map((c,index)=>({id:c.id,old:c.position,next:rows[index].position}))
          .filter(c=>c.old!==c.next);
      for(const item of changes){
        const updated=await tx.chapter.updateMany({where:{
          id:item.id,manuscriptId,deletedAt:null,position:item.old
        },data:{position:item.next}});
        if(updated.count!==1)throw Error('CHAPTER_ORDER_CONFLICT');
      }
      await tx.book.update({where:{id:bookId},data:{updatedAt:new Date()}});
      await tx.auditEvent.create({data:{
        actorId:user.id,workspaceId:book.workspaceId,subjectId:body.chapterId,
        action:'CHAPTER_REORDERED',metadata:{
          bookId,direction:body.direction,
          from:rows.findIndex(c=>c.id===body.chapterId),
          to:proposed.findIndex(c=>c.id===body.chapterId)
        }
      }});
      const final=proposed.map((c,index)=>({id:c.id,
        position:duplicates?index:rows[index].position}));
      return {status:'OK',changed:true,orderToken:chapterOrderToken(final)} as const;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:7000,timeout:12000});
    if(result.status==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(result.status==='CONFLICT')return errorResponse('CHAPTER_ORDER_CONFLICT',409);
    if(result.status==='TOO_LARGE')return errorResponse('CHAPTER_ORDER_TOO_LARGE',422);
    return Response.json({ok:true,changed:result.changed,orderToken:result.orderToken},
      {headers:{'Cache-Control':'private, no-store'}});
  }catch(e){
    if((e as {code?:string})?.code==='P2034'||
       (e instanceof Error&&e.message==='CHAPTER_ORDER_CONFLICT'))
      return errorResponse('CHAPTER_ORDER_CONFLICT',409);
    return errorResponse('CHAPTER_REORDER_FAILED',503);
  }
}
