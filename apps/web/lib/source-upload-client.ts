'use client';

export const MANUSCRIPT_ACCEPT='.docx,.pdf,.txt,.md,.epub,.odt,.png,.jpg,.jpeg,.webp';
export const MANUSCRIPT_MAX_BYTES=20*1024*1024;
export type UploadStage='authorizing'|'transferring'|'confirming';
export class SourceUploadError extends Error {
  constructor(public readonly code:string){super(code);this.name='SourceUploadError';}
}
type Ticket={name?:string;url?:string;contentType?:string;error?:string};
function failure(code:string):never{throw new SourceUploadError(code);}
async function jsonOrNull(response:Response):Promise<Ticket>{
  return response.json().catch(()=>({})) as Promise<Ticket>;
}

/** Sign on our own server, PUT the binary straight to Supabase, then confirm server-side. */
export async function uploadSourceToBook(bookId:string,file:File,onStage?:(stage:UploadStage)=>void){
  if(!file.size||file.size>MANUSCRIPT_MAX_BYTES)failure('FILE_NOT_ALLOWED_OR_TOO_LARGE');
  if(!/^[0-9a-f-]{36}$/i.test(bookId))failure('VALIDATION_ERROR');
  const endpoint='/api/v1/books/'+bookId+'/files';
  onStage?.('authorizing');
  const response=await fetch(endpoint,{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:file.name,size:file.size,type:file.type})
  });
  const ticket=await jsonOrNull(response);
  if(!response.ok)failure(ticket.error||'SOURCE_SIGN_FAILED');
  if(!ticket.url||!ticket.name||!ticket.contentType)failure('SOURCE_SIGN_FAILED');
  let url:URL;
  try{url=new URL(ticket.url);}
  catch{return failure('SOURCE_SIGN_FAILED');}
  if(url.protocol!=='https:'||!/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)||
     !url.pathname.startsWith('/storage/v1/object/upload/sign/')||!url.searchParams.has('token')){
    failure('SOURCE_SIGN_FAILED');
  }
  onStage?.('transferring');
  // The manuscript binary never crosses an application/Vercel endpoint.
  let put:Response;
  try{
    put=await fetch(url.toString(),{method:'PUT',headers:{'Content-Type':ticket.contentType,'x-upsert':'false'},body:file});
  }catch{return failure('TRANSFER_FAILED');}
  if(!put.ok)failure('TRANSFER_FAILED');
  onStage?.('confirming');
  const confirmation=await fetch(endpoint,{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'confirm',name:ticket.name,size:file.size,type:ticket.contentType})
  });
  const verified=await jsonOrNull(confirmation);
  if(!confirmation.ok||!verified || (verified as {confirmed?:boolean}).confirmed!==true){
    failure(verified.error||'NOT_CONFIRMED');
  }
  return {name:ticket.name};
}

export function uploadErrorCode(error:unknown){
  return error instanceof SourceUploadError?error.code:'TRANSFER_FAILED';
}
