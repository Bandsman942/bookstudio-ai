import {prisma} from '@bookstudio/database';
import {hashToken,sessionCookieName,isSameOrigin,errorResponse} from '@/lib/security';
import {cookies} from 'next/headers';
export async function POST(req:Request){
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const jar=await cookies(),token=jar.get(sessionCookieName)?.value;
  if(token)await prisma.session.updateMany({where:{tokenHash:hashToken(token)},data:{revokedAt:new Date()}});
  const response=Response.json({ok:true});
  response.headers.append('Set-Cookie',[sessionCookieName+'=','Path=/','HttpOnly','SameSite=Lax','Max-Age=0',process.env.NODE_ENV==='production'?'Secure':''].filter(Boolean).join('; '));
  return response;
}
