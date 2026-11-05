import test from 'node:test';
import assert from 'node:assert/strict';
import {scanWorkerEnabled,workerAuthorized,canonicalAttestation,verifyWorkerAttestation,
  signTestAttestation} from './scan-worker-auth.ts';
const token='ab'.repeat(32),key='cd'.repeat(32);
const env={BOOKSTUDIO_SCAN_WORKER_ENABLED:'true',BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED:'true',
  BOOKSTUDIO_SCAN_WORKER_TOKEN:token,BOOKSTUDIO_SCAN_ATTESTATION_HMAC_KEY:key};
const proof={bookId:'b9f2ffae-9454-40bf-aeb6-743391110e02',
  jobId:'0b2a95c0-b53a-4485-9b47-d4149011d561',
  sourceGeneration:'21f9b584-cd99-4b59-a2bb-3fd174e20531',
  leaseToken:'33'.repeat(32),nonce:'c664d053-ab09-4bea-94bb-93c811ee3552',
  status:'SCANNED_CLEAN',byteSize:1024,sha256:'44'.repeat(32),
  scannerVersion:'ClamAV 1.4.3/28001/Wed Nov 4 2026',
  scannedAt:'2026-11-04T17:00:00+00:00'};
const now=new Date('2026-11-04T17:00:10Z');
test('machine identity requires explicit flags, 2 distinct 32-byte secrets and constant-time token',()=>{
 assert.equal(scanWorkerEnabled(env),true);
 assert.equal(scanWorkerEnabled({...env,BOOKSTUDIO_SOURCE_SCAN_QUEUE_ENABLED:'false'}),false);
 assert.equal(workerAuthorized(new Request('https://unit.invalid',{headers:{Authorization:'Bearer '+token}}),env),true);
 for(const other of [{...env,BOOKSTUDIO_SCAN_WORKER_TOKEN:key},{...env,BOOKSTUDIO_SCAN_ATTESTATION_HMAC_KEY:token},
    {...env,BOOKSTUDIO_SCAN_WORKER_ENABLED:'false'}]){
   assert.equal(workerAuthorized(new Request('https://unit.invalid',{headers:{Authorization:'Bearer '+token}}),other),false);
 }
 assert.equal(workerAuthorized(new Request('https://unit.invalid'),env),false);
});
test('valid HMAC and timestamp binds scan job, source generation, lease, nonce and bytes',()=>{
 const signed={...proof,signature:signTestAttestation(proof,key)};
 assert.equal(signed.signature,'8772be58f3340a9a57e6ce552a2f88f472780c3b431b4d722d4e8c998d6253d3','Python/Node shared canonical HMAC vector');
 assert.deepEqual(verifyWorkerAttestation(signed,now,env),proof);
 for(const field of ['bookId','sourceGeneration','leaseToken','sha256','jobId','nonce','status']){
   const forged={...signed,[field]:field==='status'?'REJECTED':field==='sha256'?'55'.repeat(32):field==='leaseToken'?'66'.repeat(32):'d1f2ffae-9454-40bf-aeb6-743391110e02'};
   assert.equal(verifyWorkerAttestation(forged,now,env),null,field);
 }
 assert.equal(verifyWorkerAttestation({...signed,extra:'forbidden'},now,env),null);
 assert.equal(verifyWorkerAttestation(signed,new Date('2026-11-04T17:10:10Z'),env),null);
 assert.equal(verifyWorkerAttestation({...signed,status:'SCANNED_CLEAN',sha256:null},now,env),null);
 assert.equal(verifyWorkerAttestation({...signed,signature:'00'.repeat(32)},now,env),null);
 assert.equal(verifyWorkerAttestation(signed,now,{...env,BOOKSTUDIO_SCAN_ATTESTATION_HMAC_KEY:'fe'.repeat(32)}),null);
});
test('deterministic cross-language ASCII key ordering matches Python sorted keys',()=>{
 const j=canonicalAttestation(proof);
 assert.equal(j,'{"bookId":"'+proof.bookId+'","byteSize":1024,"jobId":"'+proof.jobId+
  '","leaseToken":"'+proof.leaseToken+'","nonce":"'+proof.nonce+'","scannedAt":"'+proof.scannedAt+
  '","scannerVersion":"'+proof.scannerVersion+'","sha256":"'+proof.sha256+
  '","sourceGeneration":"'+proof.sourceGeneration+'","status":"SCANNED_CLEAN"}');
});
