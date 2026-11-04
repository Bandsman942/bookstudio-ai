import test from 'node:test';
import assert from 'node:assert/strict';
import {canUseSource,publicScanStatus,scanStrictModeEnabled} from './source-security-policy.ts';

test('strict mode must be explicitly enabled, never inferred from an empty variable',()=>{
 assert.equal(scanStrictModeEnabled(undefined),false);
 assert.equal(scanStrictModeEnabled('false'),false);
 assert.equal(scanStrictModeEnabled('true'),true);
 assert.equal(scanStrictModeEnabled('TRUE'),true);
 assert.equal(scanStrictModeEnabled('1'),false);
});
test('legacy sources without row remain transparently UNSCANNED',()=>{
 assert.equal(publicScanStatus(undefined),'UNSCANNED');
 assert.equal(canUseSource(false,undefined),true);
 assert.equal(canUseSource(true,undefined),false);
});
test('fail closed for all non-clean statuses and forged incomplete confirmations',()=>{
 for(const status of ['UNSCANNED','QUEUED','SCANNING','REJECTED','SCAN_UNAVAILABLE']){
  assert.equal(canUseSource(true,{status}),false);
 }
 assert.equal(canUseSource(true,{status:'SCANNED_CLEAN'}),false);
 assert.equal(canUseSource(true,{status:'SCANNED_CLEAN',sha256:'abc',scannerVersion:'clamav',
   scannedAt:new Date()}),false);
});
test('a recorded scanner identity and checksum are mandatory in strict mode',()=>{
 const clean={status:'SCANNED_CLEAN',sha256:'a'.repeat(64),scannerVersion:'clamav-1.4',
   scannedAt:new Date('2025-01-01T00:00:00Z')};
 assert.equal(canUseSource(true,clean),true);
 assert.equal(canUseSource(true,{...clean,scannerVersion:''}),false);
 assert.equal(canUseSource(true,{...clean,scannedAt:'invalid'}),false);
 assert.equal(canUseSource(true,{...clean,scannedAt:new Date(Date.now()+86400000)}),false);
});
