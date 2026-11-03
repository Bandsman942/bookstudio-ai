import { prisma } from '@bookstudio/database';
import { activeUser, accessToBook } from '@/lib/auth';
import { isSameOrigin, errorResponse } from '@/lib/security';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ bookId:string; chapterId:string }> };

async function getChapter(bookId:string,chapterId:string,userId:string,write:boolean){
  const book=await accessToBook(bookId,userId,write);
  const chapter=book?.editions[0]?.manuscript?.chapters.find(c=>c.id===chapterId);
  return book&&chapter?{book,chapter}:null;
}

export async function GET(_request:Request,{params}:Ctx){
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,chapterId}=await params;
  const current=await getChapter(bookId,chapterId,user.id,false);
  if(!current)return errorResponse('NOT_FOUND',404);
  const comments=await prisma.editorialComment.findMany({
    where:{chapterId},orderBy:{createdAt:'desc'},take:100,
    include:{author:{select:{name:true}}}
  });
  return Response.json({
    comments:comments.map(c=>({
      id:c.id,body:c.body,quote:c.quote,baseRevision:c.baseRevision,
      startOffset:c.startOffset,endOffset:c.endOffset,
      status:c.status,stale:c.baseRevision!==current.chapter.revisionSeq,
      authorName:c.author.name,createdAt:c.createdAt,resolvedAt:c.resolvedAt
    })),currentRevision:current.chapter.revisionSeq,
  },{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}

export async function POST(req:Request,{params}:Ctx){
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId,chapterId}=await params;
  const current=await getChapter(bookId,chapterId,user.id,true);
  if(!current)return errorResponse('NOT_FOUND',404);
  if(Number(req.headers.get('content-length')||0)>8192)return errorResponse('COMMENT_TOO_LARGE',413);
  const input=await req.json().catch(()=>null);
  const body=typeof input?.body==='string'?input.body.trim():'';
  if(body.length<2||body.length>2000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body) ||
     !Number.isSafeInteger(input?.baseRevision)||input.baseRevision<0)return errorResponse('COMMENT_INVALID',400);

  const quote=typeof input?.quote==='string'&&input.quote.length>0?input.quote:null;
  const anchored=quote!==null;
  const start=input?.startOffset,end=input?.endOffset;
  if(anchored && (quote.length>500 || !Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
                  start<0||end<=start||end-start!==quote.length))return errorResponse('COMMENT_ANCHOR_INVALID');
  if(!anchored && (start!==undefined||end!==undefined))return errorResponse('COMMENT_ANCHOR_INVALID');

  try{
    const created=await prisma.$transaction(async tx=>{
      const member=await tx.membership.findFirst({
        where:{workspaceId:current.book.workspaceId,userId:user.id,role:{in:['OWNER','EDITOR']}},
        select:{id:true}
      });
      const chapter=await tx.chapter.findUnique({where:{id:chapterId},select:{revisionSeq:true}});
      if(!member||!chapter)throw new Error('NOT_FOUND');
      if(chapter.revisionSeq!==input.baseRevision)throw new Error('REVISION_CONFLICT');
      if(anchored){
        const revision=await tx.documentRevision.findUnique({
          where:{chapterId_sequence:{chapterId,sequence:chapter.revisionSeq}},select:{text:true}
        });
        if(!revision||revision.text.slice(start,end)!==quote)throw new Error('COMMENT_ANCHOR_MISMATCH');
      }
      const comment=await tx.editorialComment.create({
        data:{chapterId,authorId:user.id,body,baseRevision:chapter.revisionSeq,
          ...(anchored?{quote,startOffset:start,endOffset:end}:{})}
      });
      await tx.auditEvent.create({data:{actorId:user.id,workspaceId:current.book.workspaceId,
        subjectId:chapterId,action:'EDITORIAL_COMMENT_CREATED',metadata:{commentId:comment.id,baseRevision:chapter.revisionSeq}}});
      return comment;
    },{isolationLevel:'Serializable' as Prisma.TransactionIsolationLevel});
    return Response.json({comment:{id:created.id,status:created.status,baseRevision:created.baseRevision}},
      {status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const message=error instanceof Error?error.message:'';
    if(message==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
    if(message==='REVISION_CONFLICT'||(error as {code?:string})?.code==='P2034')return errorResponse('REVISION_CONFLICT',409);
    if(message==='COMMENT_ANCHOR_MISMATCH')return errorResponse(message,409);
    return errorResponse('COMMENT_CREATE_FAILED',503);
  }
}
