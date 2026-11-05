import {randomBytes} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {errorResponse} from '@/lib/security';
import {isStoredName,listFiles,signDownload} from '@/lib/supabase-storage';
import {LEASE_DURATION_MS,RETRY_DELAY_MS,MAX_SCAN_ATTEMPTS,
  workerAuthorized,boundedJson,sha256} from '@/lib/scan-worker-auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
type Ticket={jobId:string;bookId:string;storageName:string;sourceGeneration:string;
  declaredByteSize:number;declaredMediaType:string;leaseToken:string;expiresAt:Date;attempts:number};
/** No browser, Vercel function or client ever receives manuscript bytes. */
export async function POST(request:Request){
  if(!workerAuthorized(request))return errorResponse('NOT_FOUND',404);
  const body=await boundedJson(request,1024);
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length>0)
    return errorResponse('WORKER_REQUEST_INVALID',400);
  const now=new Date();
  let ticket:Ticket|null=null;
  try{
    ticket=await prisma.$transaction(async tx=>{
      const jobs=await tx.sourceScanJob.findMany({
        where:{OR:[
          {status:'QUEUED',OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lte:now}}]},
          {status:'LEASED',leaseExpiresAt:{lte:now}}
        ]},
        orderBy:{createdAt:'asc'},take:20,
        select:{id:true,bookId:true,storageName:true,sourceGeneration:true,
          declaredByteSize:true,declaredMediaType:true,status:true,attempts:true,
          leaseExpiresAt:true}
      });
      for(const job of jobs){
        const book=await tx.book.findFirst({where:{id:job.bookId,archivedAt:null},select:{id:true}});
        const source=await tx.sourceSecurityRecord.findUnique({
          where:{bookId_storageName:{bookId:job.bookId,storageName:job.storageName}},
          select:{sourceGeneration:true,status:true,byteSize:true,mediaType:true}
        });
        if(!book||!source||source.sourceGeneration!==job.sourceGeneration||
          source.byteSize!==job.declaredByteSize||
          source.mediaType!==job.declaredMediaType||
          !['QUEUED','SCANNING'].includes(source.status)||
          !isStoredName(job.storageName)){
          await tx.sourceScanJob.updateMany({where:{id:job.id,status:job.status},
            data:{status:'CANCELLED',leaseTokenHash:null,leaseExpiresAt:null}});
          continue;
        }
        if(job.attempts>=MAX_SCAN_ATTEMPTS){
          await tx.sourceScanJob.updateMany({where:{id:job.id,status:job.status},
            data:{status:'FAILED',leaseTokenHash:null,leaseExpiresAt:null,finishedAt:now}});
          await tx.sourceSecurityRecord.updateMany({where:{bookId:job.bookId,
            storageName:job.storageName,sourceGeneration:job.sourceGeneration,
            status:{in:['QUEUED','SCANNING']}},data:{status:'SCAN_UNAVAILABLE'}});
          continue;
        }
        const leaseToken=randomBytes(32).toString('hex'),expiresAt=new Date(now.getTime()+LEASE_DURATION_MS);
        const changed=await tx.sourceScanJob.updateMany({
          where:{id:job.id,status:job.status,attempts:job.attempts,
            leaseExpiresAt:job.leaseExpiresAt},
          data:{status:'LEASED',attempts:{increment:1},leaseTokenHash:sha256(leaseToken),
            leaseExpiresAt:expiresAt}
        });
        if(changed.count!==1)continue;
        const changedSource=await tx.sourceSecurityRecord.updateMany({where:{
          bookId:job.bookId,storageName:job.storageName,sourceGeneration:job.sourceGeneration,
          status:{in:['QUEUED','SCANNING']}
        },data:{status:'SCANNING'}});
        if(changedSource.count!==1)throw Error('STALE_GENERATION');
        return {jobId:job.id,bookId:job.bookId,storageName:job.storageName,
          sourceGeneration:job.sourceGeneration,declaredByteSize:job.declaredByteSize,
          declaredMediaType:job.declaredMediaType,leaseToken,expiresAt,attempts:job.attempts+1};
      }
      return null;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:10000});
  }catch{
    return errorResponse('WORKER_CLAIM_RETRY',503);
  }
  if(!ticket)return Response.json({job:null},{headers:noStore});
  try{
    // Verify signed download is only for a currently confirmed private source.
    const file=(await listFiles(ticket.bookId)).find(f=>f.name===ticket.storageName);
    if(!file||file.size!==ticket.declaredByteSize||
       file.contentType!==ticket.declaredMediaType)throw Error('STORAGE_MISMATCH');
    const url=await signDownload(ticket.bookId,ticket.storageName);
    return Response.json({job:{...ticket,downloadUrl:url}},{headers:noStore});
  }catch{
    // Signed URL failure must not leave SCANNING forever.
    try{
      const exhausted=ticket.attempts>=MAX_SCAN_ATTEMPTS;
      await prisma.$transaction(async tx=>{
        const changed=await tx.sourceScanJob.updateMany({where:{
          id:ticket!.jobId,status:'LEASED',leaseTokenHash:sha256(ticket!.leaseToken),
          sourceGeneration:ticket!.sourceGeneration
        },data:{status:exhausted?'FAILED':'QUEUED',
          leaseTokenHash:null,leaseExpiresAt:exhausted?null:new Date(Date.now()+RETRY_DELAY_MS),
          ...(exhausted?{finishedAt:new Date()}:{})}});
        if(changed.count===1)await tx.sourceSecurityRecord.updateMany({where:{
          bookId:ticket!.bookId,storageName:ticket!.storageName,
          sourceGeneration:ticket!.sourceGeneration,status:'SCANNING'
        },data:{status:exhausted?'SCAN_UNAVAILABLE':'QUEUED'}});
      });
    }catch{}
    return errorResponse('WORKER_SOURCE_UNAVAILABLE',503);
  }
}
