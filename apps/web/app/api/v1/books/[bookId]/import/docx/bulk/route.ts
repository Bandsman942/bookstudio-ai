import {prisma} from '@bookstudio/database';
import {createHash} from 'node:crypto';
import type {Prisma} from '@prisma/client';
import {activeUser,accessToBook} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {isBookId,listFiles} from '@/lib/supabase-storage';
import {prepareReviewedDocxBatch} from '@/lib/reviewed-docx-batch';
import {ReviewedImportError} from '@/lib/reviewed-docx-import';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
const MAX_REQUEST_BYTES=900_000;
const WORD_TYPE='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function json(data:unknown,status=200){
  return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:Request,{params}:Ctx){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(Number(request.headers.get('content-length')||0)>MAX_REQUEST_BYTES)
    return errorResponse('DOCX_PAYLOAD_TOO_LARGE',413);
  const user=await activeUser();
  if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId}=await params;
  if(!isBookId(bookId))return errorResponse('NOT_FOUND',404);
  const book=await accessToBook(bookId,user.id,true);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!book||!manuscriptId)return errorResponse('NOT_FOUND_OR_FORBIDDEN',404);

  let payload:unknown;
  try{
    const text=await request.text();
    if(new TextEncoder().encode(text).byteLength>MAX_REQUEST_BYTES)
      return errorResponse('DOCX_PAYLOAD_TOO_LARGE',413);
    payload=JSON.parse(text);
  }catch{return errorResponse('DOCX_BATCH_INVALID');}
  let validated:ReturnType<typeof prepareReviewedDocxBatch>;
  try{validated=prepareReviewedDocxBatch(payload);}
  catch(error){
    return errorResponse(error instanceof ReviewedImportError?error.code:'DOCX_BATCH_INVALID',422);
  }
  const {sourceName,batchId,chapters}=validated;
  const operationIds=chapters.map(c=>c.operationId);
  const hashes=chapters.map(c=>hash({title:c.title,sourceName,content:c.content}));

  const replay=async()=>{
    const rows=await prisma.manuscriptSourceImport.findMany({
      where:{bookId,operationId:{in:operationIds}},
      select:{chapterId:true,operationId:true,requestHash:true,sourceName:true}
    });
    if(!rows.length)return null;
    const indexed=new Map(rows.map(x=>[x.operationId,x]));
    if(rows.length!==operationIds.length||
       operationIds.some((id,i)=>indexed.get(id)?.requestHash!==hashes[i]||
         indexed.get(id)?.sourceName!==sourceName))
      return errorResponse('DOCX_BATCH_CONFLICT',409);
    return json({chapters:operationIds.map(id=>({id:indexed.get(id)!.chapterId})),
      replayed:true,chapterCount:chapters.length});
  };
  try{
    const existing=await replay();if(existing)return existing;
  }catch{return errorResponse('DOCX_IMPORT_UNAVAILABLE',503);}

  // The approved source must be physically present inside the same private book.
  try{
    const source=(await listFiles(bookId)).find(f=>f.name===sourceName);
    if(!source)return errorResponse('DOCX_SOURCE_NOT_FOUND',404);
    if(source.contentType!==WORD_TYPE||!Number.isSafeInteger(source.size)||
       source.size<1||source.size>20*1024*1024)
      return errorResponse('DOCX_SOURCE_INVALID',422);
  }catch{return errorResponse('STORAGE_UNAVAILABLE',503);}

  try{
    const result=await prisma.$transaction(async tx=>{
      const previous=await tx.manuscriptSourceImport.findMany({
        where:{bookId,operationId:{in:operationIds}},
        select:{chapterId:true,operationId:true,requestHash:true,sourceName:true}
      });
      if(previous.length){
        const indexed=new Map(previous.map(r=>[r.operationId,r]));
        if(previous.length!==chapters.length||
           operationIds.some((id,i)=>indexed.get(id)?.requestHash!==hashes[i]||
             indexed.get(id)?.sourceName!==sourceName))
          throw Error('DOCX_BATCH_CONFLICT');
        return {chapters:operationIds.map(id=>({id:indexed.get(id)!.chapterId})),replayed:true};
      }
      const maximum=await tx.chapter.aggregate({where:{manuscriptId},_max:{position:true}});
      const start=(maximum._max.position??-1)+1;
      const created:{id:string}[]=[];
      for(let i=0;i<chapters.length;i++){
        const reviewed=chapters[i];
        const chapter=await tx.chapter.create({
          data:{manuscriptId,title:reviewed.title,position:start+i}
        });
        await tx.documentRevision.create({data:{
          chapterId:chapter.id,sequence:0,content:reviewed.content as Prisma.InputJsonValue,
          text:reviewed.text,contentHash:hash(reviewed.content),authorId:user.id
        }});
        await tx.manuscriptSourceImport.create({data:{
          bookId,chapterId:chapter.id,operationId:reviewed.operationId,
          sourceName,requestHash:hashes[i],actorId:user.id
        }});
        created.push({id:chapter.id});
      }
      await tx.auditEvent.create({data:{
        actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
        action:'DOCX_REVIEWED_BATCH_CREATED',
        metadata:{sourceName,batchId,chapterCount:created.length}
      }});
      return {chapters:created,replayed:false};
    },{isolationLevel:'Serializable',maxWait:10000,timeout:20000});
    return json({chapters:result.chapters,replayed:result.replayed,chapterCount:result.chapters.length},
      result.replayed?200:201);
  }catch(error){
    if(error instanceof Error&&error.message==='DOCX_BATCH_CONFLICT')
      return errorResponse('DOCX_BATCH_CONFLICT',409);
    if(['P2002','P2034'].includes((error as {code?:string})?.code??'')){
      try{const existing=await replay();if(existing)return existing;}
      catch{}
      return errorResponse('DOCX_IMPORT_CONFLICT',409);
    }
    return errorResponse('DOCX_IMPORT_FAILED',503);
  }
}
