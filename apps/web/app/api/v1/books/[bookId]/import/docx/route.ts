import {prisma} from '@bookstudio/database';
import {createHash} from 'node:crypto';
import type {Prisma} from '@prisma/client';
import {activeUser,accessToBook} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {isBookId,listFiles} from '@/lib/supabase-storage';
import {canUseSource,scanStrictModeEnabled} from '@/lib/source-security-policy';
import {prepareReviewedDocxImport,ReviewedImportError} from '@/lib/reviewed-docx-import';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
const MAX_REQUEST_BYTES=850_000;
const WORD_TYPE='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function digest(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function json(data:unknown,status=200){
  return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:Request,{params}:Ctx){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(Number(request.headers.get('content-length')||0)>MAX_REQUEST_BYTES)
    return errorResponse('DOCX_PAYLOAD_TOO_LARGE',413);
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  const {bookId}=await params;if(!isBookId(bookId))return errorResponse('NOT_FOUND',404);
  const book=await accessToBook(bookId,user.id,true);
  const manuscriptId=book?.editions[0]?.manuscript?.id;
  if(!book||!manuscriptId)return errorResponse('NOT_FOUND_OR_FORBIDDEN',404);

  let payload:unknown;
  try{
    const text=await request.text();
    if(new TextEncoder().encode(text).byteLength>MAX_REQUEST_BYTES)
      return errorResponse('DOCX_PAYLOAD_TOO_LARGE',413);
    payload=JSON.parse(text);
  }catch{return errorResponse('DOCX_REVIEW_INVALID');}
  let reviewed:ReturnType<typeof prepareReviewedDocxImport>;
  try{reviewed=prepareReviewedDocxImport(payload);}
  catch(error){return errorResponse(error instanceof ReviewedImportError?error.code:'DOCX_REVIEW_INVALID',422);}

  // The parsed text is explicitly author-provided, not a claim of Word fidelity.
  const {title,sourceName,operationId,content,text}=reviewed;
  const requestHash=digest({title,sourceName,content});
  const replay=async()=>{
    const existing=await prisma.manuscriptSourceImport.findUnique({
      where:{bookId_operationId:{bookId,operationId}},
      select:{chapterId:true,requestHash:true,sourceName:true}
    });
    if(!existing)return null;
    return existing.requestHash===requestHash&&existing.sourceName===sourceName?
      json({chapter:{id:existing.chapterId},replayed:true}):
      errorResponse('DOCX_OPERATION_CONFLICT',409);
  };
  try{
    const existing=await replay();if(existing)return existing;
  }catch{return errorResponse('DOCX_IMPORT_UNAVAILABLE',503);}

  // The owner can only reference an existing private DOCX in this very book.
  try{
    const source=(await listFiles(bookId)).find(file=>file.name===sourceName);
    if(!source)return errorResponse('DOCX_SOURCE_NOT_FOUND',404);
    if(source.contentType!==WORD_TYPE||!Number.isSafeInteger(source.size)||
       source.size<1||source.size>20*1024*1024)
      return errorResponse('DOCX_SOURCE_INVALID',422);
    const required=scanStrictModeEnabled(process.env.BOOKSTUDIO_REQUIRE_SCANNED_SOURCES);
    if(required){
      const record=await prisma.sourceSecurityRecord.findUnique({
        where:{bookId_storageName:{bookId,storageName:sourceName}}
      });
      if(!canUseSource(required,record))return errorResponse('SOURCE_SCAN_REQUIRED',423);
    }
  }catch{return errorResponse('STORAGE_UNAVAILABLE',503);}

  const contentHash=digest(content);
  try{
    const result=await prisma.$transaction(async tx=>{
      const existing=await tx.manuscriptSourceImport.findUnique({
        where:{bookId_operationId:{bookId,operationId}},
        select:{chapterId:true,requestHash:true,sourceName:true}
      });
      if(existing){
        if(existing.requestHash!==requestHash||existing.sourceName!==sourceName)
          throw Error('DOCX_OPERATION_CONFLICT');
        return {id:existing.chapterId,replayed:true};
      }
      const { _max }=await tx.chapter.aggregate({where:{manuscriptId},_max:{position:true}});
      const position=(_max.position??-1)+1;
      // A NEW chapter is created. Existing chapters are never modified.
      const chapter=await tx.chapter.create({data:{manuscriptId,title,position}});
      await tx.documentRevision.create({data:{
        chapterId:chapter.id,sequence:0,content:content as Prisma.InputJsonValue,text,
        contentHash,authorId:user.id
      }});
      await tx.manuscriptSourceImport.create({data:{
        bookId,chapterId:chapter.id,operationId,sourceName,requestHash,actorId:user.id
      }});
      await tx.auditEvent.create({data:{
        actorId:user.id,workspaceId:book.workspaceId,subjectId:chapter.id,
        action:'DOCX_REVIEWED_CHAPTER_CREATED',
        metadata:{sourceName,operationId,blockCount:content.content.length}
      }});
      return {id:chapter.id,replayed:false};
    },{isolationLevel:'Serializable',maxWait:10000,timeout:15000});
    return json({chapter:{id:result.id},replayed:result.replayed},result.replayed?200:201);
  }catch(error){
    if(error instanceof Error&&error.message==='DOCX_OPERATION_CONFLICT')
      return errorResponse('DOCX_OPERATION_CONFLICT',409);
    const code=(error as {code?:string})?.code;
    if(code==='P2002'||code==='P2034'){
      // An earlier request may have committed even if its response was lost.
      try{const replayed=await replay();if(replayed)return replayed;}catch{}
      return errorResponse('DOCX_IMPORT_CONFLICT',409);
    }
    return errorResponse('DOCX_IMPORT_FAILED',503);
  }
}
