import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const sessionCookieName = 'bookstudio_session';
export function hashToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function newSessionToken(): string { return randomBytes(32).toString('base64url'); }
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64, {N:16384,r:8,p:1,maxmem:32*1024*1024})) as Buffer;
  return ['scrypt','16384','8','1',salt,hash.toString('hex')].join('$');
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [algorithm,n,r,p,salt,expected]=encoded.split('$');
    if(algorithm!=='scrypt'||n!=='16384'||r!=='8'||p!=='1'||!/^[0-9a-f]{32}$/.test(salt)||!/^[0-9a-f]{128}$/.test(expected))return false;
    const actual=(await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024})) as Buffer;
    return timingSafeEqual(actual,Buffer.from(expected,'hex'));
  } catch { return false; }
}
export function isSameOrigin(request: Request): boolean {
  const origin=request.headers.get('origin'); if(!origin)return false;
  let expected=process.env.APP_ORIGIN||new URL(request.url).origin;
  try { expected=new URL(expected).origin;return new URL(origin).origin===expected; }catch{return false;}
}
export function errorResponse(reason:string,status=400,detail?:Record<string,unknown>){
  return Response.json({error:reason,...(detail??{})},{status,headers:{'Cache-Control':'no-store'}});
}
