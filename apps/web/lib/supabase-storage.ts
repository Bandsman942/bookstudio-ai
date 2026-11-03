import {randomUUID} from 'node:crypto';

/** BookStudio stores binaries in a private Supabase bucket, never on Vercel. */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const types: Record<string,string[]> = {
  docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip'],
  pdf:['application/pdf'],txt:['text/plain'],md:['text/markdown','text/plain'],
  epub:['application/epub+zip','application/zip'],odt:['application/vnd.oasis.opendocument.text','application/zip'],
  png:['image/png'],jpg:['image/jpeg'],jpeg:['image/jpeg'],webp:['image/webp']
};
export type FileInfo={name:string;size:number;createdAt:string|null};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const storedName=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-z0-9][a-z0-9._-]{0,95}$/i;
export function isBookId(value:string){return uuid.test(value);}
export function isStoredName(value:string){return storedName.test(value)&&!value.includes('..');}
export function validateSource(value:unknown): {name:string;size:number;contentType:string}|null {
  if(!value||typeof value!=='object')return null;
  const v=value as Record<string,unknown>;
  if(typeof v.name!=='string'||v.name.length<1||v.name.length>180)return null;
  if(v.name.includes('/')||v.name.includes('\\')||v.name.includes('..'))return null;
  if(!Number.isSafeInteger(v.size)||Number(v.size)<1||Number(v.size)>MAX_SOURCE_BYTES)return null;
  const extension=v.name.split('.').pop()?.toLowerCase()??'';
  if(!Object.hasOwn(types,extension))return null;
  const contentType=typeof v.type==='string'?v.type.toLowerCase().split(';')[0].trim():'';
  if(contentType&&contentType!=='application/octet-stream'&&!types[extension].includes(contentType))return null;
  const sanitized=v.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^[-._]+/,'').slice(-96).toLowerCase();
  if(!sanitized||sanitized.includes('..')||!sanitized.endsWith('.'+extension))return null;
  return {name:sanitized,size:Number(v.size),contentType:types[extension][0]};
}
export function makeStoredName(name:string){return randomUUID()+'-'+name;}
export function bookPrefix(bookId:string){if(!isBookId(bookId))throw Error('INVALID_BOOK');return 'books/'+bookId+'/';}
export function filePath(bookId:string,name:string){if(!isStoredName(name))throw Error('INVALID_FILE');return bookPrefix(bookId)+name;}
export function getStorageConfig(){
  const rawUrl=process.env.SUPABASE_URL?.trim();
  const secret=process.env.SUPABASE_SECRET_KEY?.trim();
  const bucket=process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if(!rawUrl||!secret||!bucket)throw Error('STORAGE_NOT_CONFIGURED');
  const u=new URL(rawUrl);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||
     !/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname)||u.search||u.hash)throw Error('STORAGE_NOT_CONFIGURED');
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(bucket))throw Error('STORAGE_NOT_CONFIGURED');
  return {origin:u.origin,secret,bucket};
}
async function storageFetch(method:string,path:string,body?:unknown):Promise<unknown>{
  const config=getStorageConfig();
  let response:Response;
  try{
    response=await fetch(config.origin+'/storage/v1'+path,{
      method,headers:{apikey:config.secret,...(body===undefined?{}:{'Content-Type':'application/json'})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
      signal:AbortSignal.timeout(15000),cache:'no-store'
    });
  }catch{throw Error('STORAGE_UNAVAILABLE');}
  if(!response.ok)throw Error('STORAGE_UNAVAILABLE');
  if(method==='DELETE')return null;
  return response.json().catch(()=>{throw Error('STORAGE_UNAVAILABLE');});
}
function safeSignedUrl(relative:string){
  const config=getStorageConfig();
  // Supabase Storage sends paths relative to /storage/v1.
  const url=relative.startsWith('https:')?new URL(relative):
    new URL('/storage/v1'+(relative.startsWith('/')?relative:'/'+relative),config.origin);
  if(url.origin!==config.origin||!url.pathname.startsWith('/storage/v1/object/'))throw Error('STORAGE_UNAVAILABLE');
  return url.toString();
}
export async function signUpload(bookId:string,name:string){
  const config=getStorageConfig(),path=filePath(bookId,name);
  const response=await storageFetch('POST','/object/upload/sign/'+encodeURIComponent(config.bucket)+'/'+path,{}) as {url?:string};
  if(typeof response.url!=='string')throw Error('STORAGE_UNAVAILABLE');
  const signedUrl=safeSignedUrl(response.url);
  if(!new URL(signedUrl).searchParams.get('token'))throw Error('STORAGE_UNAVAILABLE');
  return signedUrl;
}
export async function listFiles(bookId:string):Promise<FileInfo[]>{
  const config=getStorageConfig();
  const results=await storageFetch('POST','/object/list/'+encodeURIComponent(config.bucket),{
    prefix:bookPrefix(bookId),limit:100,offset:0,sortBy:{column:'created_at',order:'desc'}
  });
  if(!Array.isArray(results))throw Error('STORAGE_UNAVAILABLE');
  return results.filter((x):x is Record<string,any>=>!!x&&typeof x==='object'
    &&typeof x.name==='string'&&isStoredName(x.name)).map(x=>({
    name:x.name,size:Number.isFinite(Number(x.metadata?.size))?Number(x.metadata.size):0,
    createdAt:typeof x.created_at==='string'?x.created_at:null
  }));
}
export async function signDownload(bookId:string,name:string){
  const config=getStorageConfig();
  const path=filePath(bookId,name);
  const response=await storageFetch('POST','/object/sign/'+encodeURIComponent(config.bucket)+'/'+path,{expiresIn:90}) as {signedURL?:string;signedUrl?:string};
  const raw=response.signedURL??response.signedUrl;
  if(typeof raw!=='string')throw Error('STORAGE_UNAVAILABLE');
  const url=new URL(safeSignedUrl(raw));
  url.searchParams.set('download',name.replace(uuid,'').replace(/^-/,''));
  return url.toString();
}
export async function deleteFile(bookId:string,name:string){
  const config=getStorageConfig();
  await storageFetch('DELETE','/object/'+encodeURIComponent(config.bucket)+'/'+filePath(bookId,name));
}
