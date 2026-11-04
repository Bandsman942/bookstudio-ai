/** Source scan queue contract. A job is never an antivirus verdict. */
export const MAX_QUEUE_PER_BOOK_HOUR=30;
export function scanQueueEnabled(value?:string):boolean{
  return value?.trim().toLowerCase()==='true';
}
export function queueStatus(enabled:boolean):'QUEUED'|'UNSCANNED'{
  return enabled?'QUEUED':'UNSCANNED';
}
type CurrentSource={sourceGeneration:string;status:string}|null|undefined;
type PendingJob={sourceGeneration:string;status:string;attempts:number;leaseExpiresAt?:Date|null};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Prevents any future worker from finalizing a job from an invalidated generation. */
export function jobMatchesCurrentSource(job:PendingJob,current:CurrentSource):boolean{
  return !!current&&uuid.test(job.sourceGeneration)&&
    current.sourceGeneration===job.sourceGeneration&&
    (current.status==='QUEUED'||current.status==='SCANNING')&&
    (job.status==='QUEUED'||job.status==='LEASED')&&
    Number.isSafeInteger(job.attempts)&&job.attempts>=0&&job.attempts<=3;
}
export function canClaimJob(job:PendingJob,current:CurrentSource,now:Date):boolean{
  return jobMatchesCurrentSource(job,current)&&job.status==='QUEUED'&&
    (!job.leaseExpiresAt||job.leaseExpiresAt.getTime()<=now.getTime());
}
/** No SCANNED_CLEAN transition exists here: only an attested worker may add one. */
