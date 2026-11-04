import {prisma} from '@bookstudio/database';
import {activeUser} from '@/lib/auth';
import {isSameOrigin,errorResponse} from '@/lib/security';
import {MAX_SOURCE_BYTES,isBookId,isStoredName,validateSource,makeStoredName,
  signUpload,signDownload,deleteFile,listFiles,confirmStoredSource} from '@/lib/supabase-storage';
import {canUseSource,publicScanStatus,scanStrictModeEnabled} from '@/lib/source-security-policy';

export const dynamic='force-dynamic';
export const runtime='nodejs';
type Ctx={params:Promise<{bookId:string}>};

async function authorize(bookId:string,write:boolean){
  if(!isBookId(bookId))return null;
  const user=await activeUser();
  if(!user)return null;
  const book=await prisma.book.findFirst({
    where:{id:bookId,archivedAt:null,workspace:{memberships:{some:{
      userId:user.id,role:{in:write?['OWNER','EDITOR']:['OWNER','EDITOR','REVIEWER','VIEWER']}
    }}}},
    select:{id:true,workspaceId:true}
  });
  return book?{user,book}:null;
}
function storageError(error:unknown){
  return errorResponse(error instanceof Error&&error.message==='STORAGE_NOT_CONFIGURED'?
    'STORAGE_NOT_CONFIGURED':'STORAGE_UNAVAILABLE',503);
}
export async function GET(_req:Request,{params}:Ctx){
  const {bookId}=await params,auth=await authorize(bookId,false);
  if(!auth)return errorResponse('NOT_FOUND_OR_FORBIDDEN',404);
  try{
    const files=await listFiles(bookId);
    const records=await prisma.sourceSecurityRecord.findMany({
      where:{bookId,storageName:{in:files.map(f=>f.name)}},
      select:{storageName:true,status:true}
    });
    const statuses=new Map(records.map(r=>[r.storageName,r.status]));
    return Response.json({
      files:files.map(f=>({...f,scanStatus:publicScanStatus(
        statuses.has(f.name)?{status:statuses.get(f.name)!}:undefined
      )})),
      maxBytes:MAX_SOURCE_BYTES,
      scanRequired:scanStrictModeEnabled(process.env.BOOKSTUDIO_REQUIRE_SCANNED_SOURCES)
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return storageError(error);}
}
export async function POST(request:Request,{params}:Ctx){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(Number(request.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
  const {bookId}=await params;
  const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
  if(!isBookId(bookId))return errorResponse('NOT_FOUND',404);
  const payload=await request.json().catch(()=>null);
  if(!payload||typeof payload!=='object')return errorResponse('VALIDATION_ERROR');
  const download=payload.action==='download';
  const confirm=payload.action==='confirm';
  const auth=await authorize(bookId,!download);
  if(!auth)return errorResponse('NOT_FOUND_OR_FORBIDDEN',404);
  try{
    if(download){
      if(typeof payload.name!=='string'||!isStoredName(payload.name))return errorResponse('VALIDATION_ERROR');
      // Prevent signing a URL for a missing object.
      const listed=await listFiles(bookId);
      if(!listed.some(file=>file.name===payload.name))return errorResponse('NOT_FOUND',404);
      const required=scanStrictModeEnabled(process.env.BOOKSTUDIO_REQUIRE_SCANNED_SOURCES);
      if(required){
        const record=await prisma.sourceSecurityRecord.findUnique({
          where:{bookId_storageName:{bookId,storageName:payload.name}}
        });
        if(!canUseSource(required,record))return errorResponse('SOURCE_SCAN_REQUIRED',423);
      }
      return Response.json({url:await signDownload(bookId,payload.name)},
        {headers:{'Cache-Control':'no-store'}});
    }
    if(confirm){
      if(typeof payload.name!=='string'||typeof payload.type!=='string'||
         !Number.isSafeInteger(payload.size))return errorResponse('VALIDATION_ERROR');
      const status=await confirmStoredSource(bookId,{name:payload.name,size:payload.size,type:payload.type});
      if(status==='invalid')return errorResponse('FILE_NOT_ALLOWED_OR_TOO_LARGE',422);
      if(status==='not_found')return errorResponse('SOURCE_NOT_FOUND',404);
      if(status==='size_mismatch')return errorResponse('SOURCE_SIZE_MISMATCH',409);
      if(status==='type_mismatch')return errorResponse('SOURCE_TYPE_MISMATCH',409);
      // Confirmed storage metadata is NOT a malware scan. Reset on each re-confirmation.
      const normalized=validateSource({name:payload.name.slice(37),size:payload.size,type:payload.type});
      if(!normalized)return errorResponse('SOURCE_TYPE_MISMATCH',409);
      await prisma.sourceSecurityRecord.upsert({
        where:{bookId_storageName:{bookId,storageName:payload.name}},
        create:{
          bookId,storageName:payload.name,byteSize:payload.size,
          mediaType:normalized.contentType,confirmedById:auth.user.id,status:'UNSCANNED'
        },
        update:{
          byteSize:payload.size,mediaType:normalized.contentType,
          confirmedById:auth.user.id,status:'UNSCANNED',
          sha256:null,scannerVersion:null,scannedAt:null
        }
      });
      await prisma.auditEvent.create({data:{
        actorId:auth.user.id,workspaceId:auth.book.workspaceId,subjectId:bookId,
        action:'BOOK_SOURCE_UPLOAD_CONFIRMED',metadata:{name:payload.name,size:payload.size,scanStatus:'UNSCANNED'}
      }});
      return Response.json({ok:true,confirmed:true,scanStatus:'UNSCANNED'},
        {headers:{'Cache-Control':'no-store'}});
    }
    if(payload.action!==undefined)return errorResponse('VALIDATION_ERROR');
    const source=validateSource(payload);
    if(!source)return errorResponse('FILE_NOT_ALLOWED_OR_TOO_LARGE',422,{maxBytes:MAX_SOURCE_BYTES});
    const name=makeStoredName(source.name);
    const url=await signUpload(bookId,name);
    await prisma.auditEvent.create({data:{
      actorId:auth.user.id,workspaceId:auth.book.workspaceId,subjectId:bookId,
      action:'BOOK_SOURCE_UPLOAD_SIGNED',metadata:{name,size:source.size,contentType:source.contentType}
    }});
    return Response.json({name,url,contentType:source.contentType,maxBytes:MAX_SOURCE_BYTES},{status:201,
      headers:{'Cache-Control':'no-store'}});
  }catch(error){return storageError(error);}
}
export async function DELETE(request:Request,{params}:Ctx){
  if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(Number(request.headers.get('content-length')||0)>4096)return errorResponse('VALIDATION_ERROR',413);
  const {bookId}=await params;
  const auth=await authorize(bookId,true);
  if(!auth)return errorResponse('NOT_FOUND_OR_FORBIDDEN',404);
  const body=await request.json().catch(()=>null);
  if(typeof body?.name!=='string'||!isStoredName(body.name))return errorResponse('VALIDATION_ERROR');
  try{
    // Once used to create an editorial revision, the original must stay available.
    const used=await prisma.manuscriptSourceImport.count({where:{bookId,sourceName:body.name}});
    if(used>0)return errorResponse('SOURCE_IN_USE',409);
    await deleteFile(bookId,body.name);
    await prisma.sourceSecurityRecord.deleteMany({where:{bookId,storageName:body.name}});
    await prisma.auditEvent.create({data:{
      actorId:auth.user.id,workspaceId:auth.book.workspaceId,subjectId:bookId,
      action:'BOOK_SOURCE_DELETED',metadata:{name:body.name}
    }});
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return storageError(error);}
}
