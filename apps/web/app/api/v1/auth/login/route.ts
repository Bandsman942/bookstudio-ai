import { prisma } from '@bookstudio/database';
import { hashToken,newSessionToken,verifyPassword,sessionCookieName,isSameOrigin,errorResponse } from '@/lib/security';
export async function POST(req:Request) {
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const data=await req.json().catch(()=>null);
  if(!data||typeof data.email!=='string'||typeof data.password!=='string')return errorResponse('VALIDATION_ERROR');
  const email=data.email.trim().toLowerCase();
  if(email.length>320||data.password.length>128)return errorResponse('UNAUTHENTICATED',401);
  const user=await prisma.user.findUnique({where:{email}});
  // TODO BS-003: distributed rate limit, CSRF + brute-force review before public deployment.
  if(!user||user.status!=='ACTIVE'||!await verifyPassword(data.password,user.passwordHash))return errorResponse('UNAUTHENTICATED',401);
  const token=newSessionToken(),duration=7*24*60*60;
  await prisma.session.create({data:{userId:user.id,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+duration*1000)}});
  const response=Response.json({ok:true});
  response.headers.append('Set-Cookie', [sessionCookieName+'='+token,'Path=/','HttpOnly','SameSite=Lax','Max-Age='+duration,process.env.NODE_ENV==='production'?'Secure':''].filter(Boolean).join('; '));
  response.headers.set('Cache-Control','no-store');
  return response;
}
