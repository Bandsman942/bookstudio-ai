import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MAX_QUEUE_PER_BOOK_HOUR,scanQueueEnabled,queueStatus,jobMatchesCurrentSource,canClaimJob}
  from './source-scan-queue.ts';
const generation='ce11d98f-3240-4239-9f73-826e670c3ac2';
const base={sourceGeneration:generation,status:'QUEUED',attempts:0};
const source={sourceGeneration:generation,status:'QUEUED'};
test('queue disabled absent explicit opt-in and never fabricates an antivirus verdict',()=>{
 assert.equal(scanQueueEnabled(undefined),false);
 assert.equal(scanQueueEnabled('false'),false);
 assert.equal(scanQueueEnabled('TrUe'),true);
 assert.equal(queueStatus(false),'UNSCANNED');
 assert.equal(queueStatus(true),'QUEUED');
 assert.equal(MAX_QUEUE_PER_BOOK_HOUR,30);
});
test('only identical book/source generation can be claimed',()=>{
 assert.equal(jobMatchesCurrentSource(base,source),true);
 assert.equal(jobMatchesCurrentSource(base,{...source,sourceGeneration:'bad-generation'}),false);
 assert.equal(jobMatchesCurrentSource(base,{...source,status:'UNSCANNED'}),false);
 assert.equal(jobMatchesCurrentSource({...base,status:'CANCELLED'},source),false);
 assert.equal(jobMatchesCurrentSource({...base,attempts:4},source),false);
 assert.equal(jobMatchesCurrentSource({...base,attempts:-1},source),false);
 assert.equal(jobMatchesCurrentSource(base,null),false);
});
test('lease already held, expired and absent states are explicit',()=>{
 const now=new Date('2026-11-04T17:00:00Z');
 assert.equal(canClaimJob(base,source,now),true);
 assert.equal(canClaimJob({...base,leaseExpiresAt:new Date('2026-11-04T17:00:01Z')},source,now),false);
 assert.equal(canClaimJob({...base,leaseExpiresAt:new Date('2026-11-04T16:59:59Z')},source,now),true);
 assert.equal(canClaimJob({...base,status:'LEASED'},source,now),false);
});
