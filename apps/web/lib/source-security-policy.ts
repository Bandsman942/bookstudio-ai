/** Clear distinction: a confirmed storage object is NOT a virus-scanned object. */
export type ScanStatus='UNSCANNED'|'QUEUED'|'SCANNING'|'SCAN_PENDING_PROMOTION'|'SCANNED_CLEAN'|'REJECTED'|'SCAN_UNAVAILABLE';
export type ScanEvidence={
  status:ScanStatus;
  sha256?:string|null;
  scannerVersion?:string|null;
  scannedAt?:Date|string|null;
} | null | undefined;

const SHA256=/^[a-f0-9]{64}$/i;

/** Opt-in strict mode; default false preserves existing private alpha workflows. */
export function scanStrictModeEnabled(envValue?:string):boolean{
  return envValue?.trim().toLowerCase()==='true';
}
/** No evidence or an unfinished/malicious scan always fails closed in strict mode. */
export function canUseSource(required:boolean,record:ScanEvidence):boolean{
  if(record?.status==='REJECTED')return false;
  if(!required)return true;
  if(!record||record.status!=='SCANNED_CLEAN'||
     !record.sha256||!SHA256.test(record.sha256)||
     !record.scannerVersion?.trim()||!record.scannedAt)return false;
  const date=record.scannedAt instanceof Date?record.scannedAt:new Date(record.scannedAt);
  return Number.isFinite(date.getTime())&&date.getTime()<=Date.now();
}
export function publicScanStatus(record:ScanEvidence):ScanStatus{
  // Avoid displaying a clean verdict without verifiable scanner identity/checksum.
  if(record?.status==='SCANNED_CLEAN'&&!canUseSource(true,record))return 'SCAN_UNAVAILABLE';
  return record?.status??'UNSCANNED';
}
