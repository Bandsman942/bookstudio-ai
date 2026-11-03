import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>{
  scryptCallback(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024},(err,key)=>err?reject(err):resolve(key));
});
export const sessionCookieName = process.env.NODE_ENV === 'production' ? '__Host-bookstudio_session' : 'bookstudio_session';
export function hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function newSessionToken(): string { return randomBytes(32).toString('base64url'); }
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password,salt);
  return ['scrypt','16384','8','1',salt,hash.toString('hex')].join('$');
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [algorithm,n,r,p,salt,expected]=encoded.split('$');
    if(algorithm!=='scrypt'||n!=='16384'||r!=='8'||p!=='1'||!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{128}$/.test(expected))return false;
    const actual=await derive(password,salt);
    return timingSafeEqual(actual,Buffer.from(expected,'hex'));
  } catch { return false; }
}
export function isSameOrigin(request: Request): boolean {
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try {
    const current=new URL(origin);
    if(current.protocol!=='https:' && process.env.NODE_ENV==='production')return false;
    const configured=[process.env.APP_ORIGIN, ...(process.env.APP_ALLOWED_ORIGINS??'').split(',')]
      .filter((x):x is string=>typeof x==='string'&&x.trim().length>0);
    // Explicit allowlist only in production: Host / forwarded headers are untrusted.
    if(process.env.NODE_ENV==='production' && configured.length===0)return false;
    const allowed=configured.length?configured:[new URL(request.url).origin];
    return allowed.some(entry=>{
      try {
        const candidate=new URL(entry.trim());
        return candidate.protocol===current.protocol && candidate.origin===current.origin;
      }catch {return false;}
    });
  } catch {return false;}
}
export function errorResponse(reason:string,status=400,detail?:Record<string,unknown>){
  return Response.json({error:reason,...(detail??{})},{status,headers:{'Cache-Control':'no-store'}});
}
