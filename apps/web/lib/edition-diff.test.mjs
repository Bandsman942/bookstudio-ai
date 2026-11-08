import test from 'node:test';
import assert from 'node:assert/strict';
import {compareEditionFingerprints} from './edition-diff.ts';
const c=(id,title,position,contentHash)=>({id,title,position,contentHash});
const H=(suffix)=>suffix.repeat(64);
test('copying an edition with new chapter UUIDs is unchanged',()=>{
  const from=[c('a','Préface',0,H('a')),c('b','Chapitre 1',1,H('b'))];
  const to=[c('c','Préface',0,H('a')),c('d','Chapitre 1',1,H('b'))];
  const out=compareEditionFingerprints(from,to);
  assert.equal(out.counts.unchanged,2);
  assert.equal(out.counts.changed,0);
  assert.equal(out.counts.added,0);
  assert.equal(out.counts.removed,0);
  assert.equal(JSON.stringify(out).includes(H('a')),false,'never return hashes');
});
test('renaming same content, modifying same title and moving chapters',()=>{
  const from=[c('a','Introduction',0,H('a')),c('b','Méthode',1,H('b'))];
  const to=[c('c','Introduction nouvelle',1,H('a')),c('d','Méthode',0,H('c'))];
  const out=compareEditionFingerprints(from,to);
  assert.equal(out.counts.changed,2);
  assert.equal(out.counts.contentChanged,1);
  assert.equal(out.counts.renamed,1);
  assert.equal(out.counts.moved,2);
  assert.equal(out.counts.added,0);assert.equal(out.counts.removed,0);
});
test('added/removed chapters stay explicit when no unique evidence matches',()=>{
  const out=compareEditionFingerprints([c('a','Ancien',0,H('a'))],
    [c('b','Nouveau',0,H('b'))]);
  assert.equal(out.counts.unchanged,0);
  assert.equal(out.counts.changed,0);
  assert.equal(out.counts.added,1);
  assert.equal(out.counts.removed,1);
});
test('duplicated titles and content remain conservative, no false lineage',()=>{
  const from=[c('a','Même',0,H('a')),c('b','Même',1,H('a'))];
  const to=[c('c','Même',3,H('a')),c('d','Même',4,H('a'))];
  const out=compareEditionFingerprints(from,to);
  assert.equal(out.counts.changed,0);
  assert.equal(out.counts.added,2);assert.equal(out.counts.removed,2);
});
test('same normalized title, same position and hash matches safely',()=>{
  const out=compareEditionFingerprints([c('a','  Préface ',0,H('a'))],
    [c('b','PRÉFACE',0,H('a'))]);
  assert.equal(out.counts.unchanged,1);
});
