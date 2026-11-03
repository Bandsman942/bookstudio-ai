import {prisma} from '@bookstudio/database';
import {hashPassword,isSameOrigin,errorResponse} from '@/lib/security';
export async function POST(req:Request){
  if(!isSameOrigin(req))return errorResponse('ORIGIN_FORBIDDEN',403);
  if(process.env.BOOKSTUDIO_PUBLIC_SIGNUP!=='true'||process.env.NODE_ENV==='production')return errorResponse('REGISTRATION_DISABLED',403);
  const data=await req.json().catch(()=>null);
  if(!data||typeof data.email!=='string'||typeof data.password!=='string'||typeof data.name!=='string')return errorResponse('VALIDATION_ERROR');
  const email=data.email.trim().toLowerCase(),name=data.name.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>320||name.length<2||name.length>140||data.password.length<12||data.password.length>128)return errorResponse('VALIDATION_ERROR');
  const passwordHash=await hashPassword(data.password);
  try{
    await prisma.$transaction(async tx=>{
      const user=await tx.user.create({data:{email,name,passwordHash}});
      const space=await tx.workspace.create({data:{ownerId:user.id,name:'Mon atelier'}});
      await tx.membership.create({data:{workspaceId:space.id,userId:user.id,role:'OWNER'}});
      await tx.auditEvent.create({data:{actorId:user.id,workspaceId:space.id,action:'IDENTITY_REGISTERED'}});
    });
    return Response.json({ok:true},{status:201});
  } catch {return errorResponse('ACCOUNT_ALREADY_EXISTS',409);}
}
