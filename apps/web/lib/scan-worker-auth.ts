import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
const MAX_SOURCE_BYTES=20*1024*1024; // same verified upload limit; no Node test import resolver assumptions

export type ScanResult='SCANNED_CLEAN'|'REJECTED'|'SCAN_UNAVAILABLE';
export type ScanAttestation={
  jobId:string;
  bookId:string;
  sourceGeneration:string;
  leaseToken:string;
  nonce:string;
  status:ScanResult;
  byteSize:number;
  sha256:string|null;
  scannerVersion:string|null;
  scannedAt:string;
};
const HEX64=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KEYS=['bookId','byteSize','jobId','leaseToken','nonce','scannedAt','scannerVersion','sha256','sourceGeneration','status'] as const;
export const LEASE_DURATION_MS=5*60_000;
export const RETRY_DELAY_MS=30_000;
export const MAX_SCAN_ATTEMPTS=3;
export const sha256=(text:string)=>createHash('sha256').update(text).digest('hex');
export function scanWorkerEnabled(env:NodeJS.ProcessEnv=process.env){
  return env.BOOKSTUDIO_SCAN_WORKER_ENABLED==='true'&&
    env.BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED==='true';
}
function secret(name:string,env:NodeJS.ProcessEnv=process.env){
  const value=env[name]??'';
  return HEX64.test(value)?value:null;
}
/** Caller identity is never based on user sessions, browser Origin or user input. */
export function workerAuthorized(request:Request,env:NodeJS.ProcessEnv=process.env){
  if(!scanWorkerEnabled(env))return false;
  const token=secret('BOOKSTUDIO_SCAN_WORKER_TOKEN',env);
  const attestationKey=secret('BOOKSTUDIO_SCAN_ATTESTATION_HMAC_KEY',env);
  if(!token||!attestationKey||token===attestationKey)return false;
  const candidate=request.headers.get('authorization')??'';
  if(!/^Bearer [0-9a-f]{64}$/.test(candidate))return false;
  return timingSafeEqual(Buffer.from(candidate.slice(7),'hex'),Buffer.from(token,'hex'));
}
export function strictJsonRequest(request:Request,maxBytes=4096):boolean{
  const type=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const header=request.headers.get('content-length');
  return type==='application/json'&&(!header||Number.isSafeInteger(Number(header))&&
    Number(header)>=0&&Number(header)<=maxBytes);
}
export async function boundedJson(request:Request,maxBytes=4096):Promise<unknown>{
  if(!strictJsonRequest(request,maxBytes))return null;
  try{
    const text=await request.text();
    if(Buffer.byteLength(text,'utf8')>maxBytes)return null;
    return JSON.parse(text);
  }catch{return null;}
}
function ascii(v:string,maxLength:number){
  return v.length>0&&v.length<=maxLength&&/^[\x20-\x7e]+$/.test(v);
}
function validAttestation(body:unknown,now:Date):body is ScanAttestation&{signature:string}{
  if(!body||typeof body!=='object'||Array.isArray(body))return false;
  const b=body as Record<string,unknown>;
  if(Object.keys(b).length!==KEYS.length+1||
    ![...KEYS,'signature'].every(k=>Object.hasOwn(b,k)))return false;
  if(![b.bookId,b.jobId,b.sourceGeneration,b.nonce].every(v=>typeof v==='string'&&UUID.test(v)))return false;
  if(typeof b.leaseToken!=='string'||!HEX64.test(b.leaseToken))return false;
  if(!['SCANNED_CLEAN','REJECTED','SCAN_UNAVAILABLE'].includes(String(b.status)))return false;
  if(typeof b.byteSize!=='number'||!Number.isSafeInteger(b.byteSize)||
    b.byteSize<1||b.byteSize>MAX_SOURCE_BYTES)return false;
  if(b.sha256!==null&&(typeof b.sha256!=='string'||!HEX64.test(b.sha256)))return false;
  if(b.scannerVersion!==null&&(typeof b.scannerVersion!=='string'||!ascii(b.scannerVersion,100)))return false;
  if(typeof b.signature!=='string'||!HEX64.test(b.signature))return false;
  if(typeof b.scannedAt!=='string'||b.scannedAt.length>40)return false;
  const scanned=new Date(b.scannedAt);
  if(!Number.isFinite(scanned.getTime())||
    Math.abs(now.getTime()-scanned.getTime())>5*60_000)return false;
  if(b.status==='SCANNED_CLEAN'&&(!b.sha256||!b.scannerVersion||
      !String(b.scannerVersion).startsWith('ClamAV ')))return false;
  return true;
}
export function canonicalAttestation(value:ScanAttestation){
  const sorted:Record<string,unknown>={};
  for(const k of KEYS)sorted[k]=value[k];
  return JSON.stringify(sorted);
}
/** HMAC covers the exact known ASCII fields, not any untrusted JSON serialization. */
export function verifyWorkerAttestation(body:unknown,now=new Date(),
  env:NodeJS.ProcessEnv=process.env):ScanAttestation|null{
  if(!validAttestation(body,now))return null;
  const key=secret('BOOKSTUDIO_SCAN_ATTESTATION_HMAC_KEY',env);
  if(!key)return null;
  const {signature,...fields}=body;
  const expected=createHmac('sha256',Buffer.from(key,'hex')).update(canonicalAttestation(fields)).digest();
  const given=Buffer.from(signature,'hex');
  return timingSafeEqual(expected,given)?fields:null;
}
export function signTestAttestation(body:ScanAttestation,keyHex:string){
  if(!HEX64.test(keyHex))throw Error('TEST_KEY_INVALID');
  return createHmac('sha256',Buffer.from(keyHex,'hex')).update(canonicalAttestation(body)).digest('hex');
}
