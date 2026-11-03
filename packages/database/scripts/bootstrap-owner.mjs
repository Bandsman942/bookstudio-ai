import { PrismaClient } from '@prisma/client';
import { randomBytes,scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCb);
const {BOOKSTUDIO_BOOTSTRAP_EMAIL:rawEmail,BOOKSTUDIO_BOOTSTRAP_PASSWORD:password,BOOKSTUDIO_BOOTSTRAP_NAME:rawName}=process.env;
const email=(rawEmail||'').trim().toLowerCase(),name=(rawName||'').trim();
if(!process.env.DATABASE_URL||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||!password||password.length<16){
  console.error('Provide DATABASE_URL, BOOKSTUDIO_BOOTSTRAP_EMAIL, NAME and PASSWORD (16+ chars) in private environment');process.exit(2);
}
if(!process.env.DATABASE_URL.includes('bookstudio')){console.error('Refusing non-BookStudio database');process.exit(2);}
const salt=randomBytes(16).toString('hex');
const digest=(await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024})).toString('hex');
const prisma=new PrismaClient();
try {
  await prisma.$transaction(async tx=>{
    if(await tx.user.findUnique({where:{email}}))throw new Error('ACCOUNT_EXISTS_NO_OVERWRITE');
    const user=await tx.user.create({data:{email,name,passwordHash:['scrypt','16384','8','1',salt,digest].join('$')}});
    const workspace=await tx.workspace.create({data:{ownerId:user.id,name:'Mon atelier'}});
    await tx.membership.create({data:{workspaceId:workspace.id,userId:user.id,role:'OWNER'}});
    await tx.auditEvent.create({data:{actorId:user.id,workspaceId:workspace.id,action:'OWNER_BOOTSTRAPPED'}});
  });
  console.info('Owner account created.');
} catch(e){ console.error(e instanceof Error?e.message:'BOOTSTRAP_FAILED');process.exitCode=1; }
finally{await prisma.$disconnect();}
