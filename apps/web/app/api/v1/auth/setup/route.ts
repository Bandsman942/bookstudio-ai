import {createHash,timingSafeEqual} from 'node:crypto';
import {prisma} from '@bookstudio/database';
import {hashPassword,isSameOrigin,errorResponse} from '@/lib/security';
import {Prisma} from '@prisma/client';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidBootstrapToken(token:string):boolean {
  const expected=process.env.BOOKSTUDIO_BOOTSTRAP_TOKEN_HASH;
  const expires=process.env.BOOKSTUDIO_BOOTSTRAP_EXPIRES_AT;
  if(!expected||!/^[a-f0-9]{64}$/.test(expected)||!expires)return false;
  const deadline=Date.parse(expires);
  if(!Number.isFinite(deadline)||Date.now()>=deadline)return false;
  if(!/^[A-Za-z0-9_-]{43,64}$/.test(token))return false;
  const actual=createHash('sha256').update(token).digest();
  return timingSafeEqual(actual,Buffer.from(expected,'hex'));
}

export async function POST(req:Request) {
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  const length=Number(req.headers.get('content-length')||0);
  if(!Number.isFinite(length)||length>8192)return errorResponse('VALIDATION_ERROR',413);
  const data=await req.json().catch(()=>null);
  if(!data || typeof data.token!=='string'||typeof data.email!=='string'||
     typeof data.name!=='string'||typeof data.password!=='string')return errorResponse('VALIDATION_ERROR',400);
  const email=data.email.trim().toLowerCase();
  const name=data.name.trim().replace(/\s+/g,' ');
  if(!emailPattern.test(email)||email.length>320||name.length<2||name.length>140||
     data.password.length<16||data.password.length>128 || data.token.length>80)
     return errorResponse('VALIDATION_ERROR',400);

  // Constant-time proof of possession. Never return differences between
  // revoked, expired and unconfigured bootstrap secrets.
  if(!isValidBootstrapToken(data.token))return errorResponse('ACTIVATION_UNAVAILABLE',403);

  const passwordHash=await hashPassword(data.password);
  try {
    await prisma.$transaction(async tx=>{
      // Advisory lock is scoped to the transaction; the first claimant wins.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(271828183)`;
      // Count is executed INSIDE the lock. After the first activation it
      // permanently closes this entrypoint even while Vercel env remains.
      if(await tx.user.count()>0)throw new Error('ALREADY_INITIALIZED');
      const user=await tx.user.create({data:{email,name,passwordHash}});
      const workspace=await tx.workspace.create({data:{ownerId:user.id,name:'Mon atelier'}});
      await tx.membership.create({data:{userId:user.id,workspaceId:workspace.id,role:'OWNER'}});
      await tx.auditEvent.create({data:{actorId:user.id,workspaceId:workspace.id,action:'OWNER_ACTIVATED_ONE_TIME'}});
    },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted});
    // First password is only chosen by the owner in this HTTPS request.
    return Response.json({ok:true,next:'/login'},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch{
    // Equal response for a raced attempt, existing user or DB failure.
    return errorResponse('ACTIVATION_UNAVAILABLE',403);
  }
}
