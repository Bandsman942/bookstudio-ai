import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {errorResponse} from '@/lib/security';
import {MAX_SCAN_ATTEMPTS,RETRY_DELAY_MS,workerAuthorized,boundedJson,
  verifyWorkerAttestation,sha256,canonicalAttestation} from '@/lib/scan-worker-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
/** The worker submits evidence, not permission to publish an object as safe. */
export async function POST(request:Request){
  if(!workerAuthorized(request))return errorResponse('NOT_FOUND',404);
  const input=await boundedJson(request,4096);
  const now=new Date(),proof=verifyWorkerAttestation(input,now);
  if(!proof)return errorResponse('WORKER_ATTESTATION_INVALID',403);
  if(!input||typeof input!=='object'||!('signature' in input))return errorResponse('WORKER_ATTESTATION_INVALID',403);
  try{
    const outcome=await prisma.$transaction(async tx=>{
      const job=await tx.sourceScanJob.findUnique({where:{id:proof.jobId},
        select:{id:true,bookId:true,sourceGeneration:true,storageName:true,
          declaredByteSize:true,declaredMediaType:true,status:true,attempts:true,
          leaseExpiresAt:true,leaseTokenHash:true}});
      if(!job||job.status!=='LEASED'||job.bookId!==proof.bookId||
        job.sourceGeneration!==proof.sourceGeneration||
        job.declaredByteSize!==proof.byteSize||
        job.leaseTokenHash!==sha256(proof.leaseToken)||
        !job.leaseExpiresAt||job.leaseExpiresAt<=now)return 'STALE' as const;
      const book=await tx.book.findFirst({where:{id:job.bookId,archivedAt:null},
        select:{id:true,workspaceId:true}});
      const source=await tx.sourceSecurityRecord.findUnique({
        where:{bookId_storageName:{bookId:job.bookId,storageName:job.storageName}},
        select:{sourceGeneration:true,status:true,byteSize:true,mediaType:true}});
      if(!book||!source||source.sourceGeneration!==job.sourceGeneration||
        source.byteSize!==job.declaredByteSize||source.mediaType!==job.declaredMediaType||
        source.status!=='SCANNING')return 'STALE' as const;
      const transient=proof.status==='SCAN_UNAVAILABLE'&&job.attempts<MAX_SCAN_ATTEMPTS;
      const finished=proof.status!=='SCAN_UNAVAILABLE';
      const targetStatus=proof.status==='SCANNED_CLEAN'?'SCAN_PENDING_PROMOTION':
        proof.status==='REJECTED'?'REJECTED':
        transient?'QUEUED':'SCAN_UNAVAILABLE';
      const resultStatus=transient?'QUEUED':finished?'FINISHED':'FAILED';
      const retryAt=transient?new Date(now.getTime()+Math.min(job.attempts,3)*RETRY_DELAY_MS):null;
      const changed=await tx.sourceScanJob.updateMany({where:{
        id:job.id,status:'LEASED',leaseTokenHash:sha256(proof.leaseToken),
        sourceGeneration:proof.sourceGeneration,leaseExpiresAt:{gt:now}
      },data:{
        status:resultStatus,leaseTokenHash:null,leaseExpiresAt:retryAt,
        attestationNonceHash:sha256(proof.nonce),
        attestationHash:sha256(canonicalAttestation(proof)+'.'+String((input as {signature:string}).signature)),
        resultStatus:proof.status,resultSha256:proof.sha256,scannerVersion:proof.scannerVersion,
        scannedAt:new Date(proof.scannedAt),finishedAt:transient?null:now
      }});
      if(changed.count!==1)return 'STALE' as const;
      const updated=await tx.sourceSecurityRecord.updateMany({where:{
        bookId:job.bookId,storageName:job.storageName,
        sourceGeneration:proof.sourceGeneration,status:'SCANNING'
      },data:{status:targetStatus,
        sha256:finished?proof.sha256:null,
        scannerVersion:finished?proof.scannerVersion:null,
        scannedAt:finished?new Date(proof.scannedAt):null
      }});
      if(updated.count!==1)throw Error('STALE_GENERATION');
      await tx.auditEvent.create({data:{actorId:null,workspaceId:book.workspaceId,
        subjectId:job.bookId,action:'SOURCE_SCAN_ATTESTED',
        metadata:{jobId:job.id,sourceGeneration:job.sourceGeneration,
          status:targetStatus,attempt:job.attempts,proofVerified:true}}});
      return {accepted:true,sourceStatus:targetStatus,retryScheduled:transient};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:10000});
    if(outcome==='STALE')return errorResponse('WORKER_LEASE_STALE',409);
    return Response.json(outcome,{headers:noStore});
  }catch{return errorResponse('WORKER_REPORT_RETRY',503);}
}
