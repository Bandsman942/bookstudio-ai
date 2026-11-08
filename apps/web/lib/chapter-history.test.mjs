import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHistoryRequest,takeHistoryPage} from './chapter-history.ts';
test('safe keyset pagination, explicit cursor and deterministic nextBefore',()=>{
 assert.deepEqual(parseHistoryRequest('http://x.test/revisions'),{limit:20,before:null});
 assert.deepEqual(parseHistoryRequest('http://x.test/revisions?limit=2&before=8'),
   {limit:2,before:8});
 const r=takeHistoryPage([{sequence:6},{sequence:5},{sequence:4}],2);
 assert.deepEqual(r,{items:[{sequence:6},{sequence:5}],nextBefore:5});
 assert.equal(takeHistoryPage([{sequence:0}],20).nextBefore,null);
});
test('reject ambiguous or expensive history pagination',()=>{
 for(const q of ['limit=0','limit=51','limit=01','limit=-1','before=-1',
  'before=NaN','before=3.5','before=999999999999999999999',
  'limit=2&limit=4','cursor=abc','before=01']){
   assert.throws(()=>parseHistoryRequest('http://x.test/revisions?'+q),
     /REVISION_HISTORY_QUERY_INVALID/,q);
 }
});
