import test from 'node:test';
import assert from 'node:assert/strict';
import {planSnapshotFork} from './snapshot-fork.ts';

const idA='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const idB='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const source='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const hash='a'.repeat(64);
const manifest={schema:'bookstudio.snapshot.v1',editionId:source,
 chapters:[{chapterId:idB,title:'Deux',position:2,revisionSeq:3,contentHash:hash},
 {chapterId:idA,title:'Un',position:0,revisionSeq:1,contentHash:hash}]};
const revisions=[
 {chapterId:idA,sequence:1,content:{type:'doc'},text:'A',contentHash:hash,
  chapter:{manuscriptId:source}},
 {chapterId:idB,sequence:3,content:{type:'doc'},text:'B',contentHash:hash,
  chapter:{manuscriptId:source}}
];
test('historical manifest order and exact revisions, never latest pointer',()=>{
 const plan=planSnapshotFork(manifest,source,revisions);
 assert.deepEqual(plan.map(c=>c.title),['Un','Deux']);
 assert.deepEqual(plan.map(c=>c.text),['A','B']);
});
test('no foreign chapter, wrong hash, missing revision, duplicate position',()=>{
 assert.throws(()=>planSnapshotFork(manifest,source,
  [{...revisions[0],chapter:{manuscriptId:idB}},revisions[1]]),/SNAPSHOT_CORRUPT/);
 assert.throws(()=>planSnapshotFork(manifest,source,
  [{...revisions[0],contentHash:'b'.repeat(64)},revisions[1]]),/SNAPSHOT_CORRUPT/);
 assert.throws(()=>planSnapshotFork(manifest,source,[revisions[0]]),/SNAPSHOT_CORRUPT/);
 const duplicate={...manifest,chapters:manifest.chapters.map(c=>({...c,position:0}))};
 assert.throws(()=>planSnapshotFork(duplicate,source,revisions),/SNAPSHOT_CORRUPT/);
});
test('invalid and oversize content refuse atomically',()=>{
 assert.throws(()=>planSnapshotFork(manifest,source,
  [{...revisions[0],content:null},revisions[1]]),/SNAPSHOT_CORRUPT/);
 assert.throws(()=>planSnapshotFork(manifest,source,
  [{...revisions[0],text:'a'.repeat(21*1024*1024)},revisions[1]]),/SNAPSHOT_COPY_TOO_LARGE/);
});
