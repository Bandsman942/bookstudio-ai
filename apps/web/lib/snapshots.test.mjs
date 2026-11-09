import test from 'node:test';
import assert from 'node:assert/strict';
import {manifestHash,parseSnapshotManifest} from './snapshots.ts';
import {planSnapshotFork} from './snapshot-fork.ts';

const edition='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const part='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const c1='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const c2='dddddddd-dddd-4ddd-dddd-dddddddddddd';
const digest='e'.repeat(64);
const baseChapter=(id,position)=>({chapterId:id,position,title:'Chapitre '+position,
  revisionSeq:0,contentHash:digest});

test('legacy v1 snapshot hash and schema are stable across parsing',()=>{
  const old={schema:'bookstudio.snapshot.v1',editionId:edition,
    chapters:[baseChapter(c1,0),baseChapter(c2,1)]};
  const parsed=parseSnapshotManifest(old);
  assert.deepEqual(parsed,old);
  assert.equal(manifestHash(parsed),manifestHash(old));
});

test('v2 snapshot freezes part title, membership and historical positions',()=>{
  const v2={schema:'bookstudio.snapshot.v2',editionId:edition,
    parts:[{id:part,title:'Partie I — Fondements'}],
    chapters:[{...baseChapter(c1,3),partId:part},
      {...baseChapter(c2,5),partId:part}]};
  const parsed=parseSnapshotManifest(v2);
  assert.deepEqual(parsed,v2);
  assert.equal(manifestHash(parsed),manifestHash(v2));
  const revisions=[c1,c2].map(chapterId=>({chapterId,sequence:0,
    content:{type:'doc'},text:'Texte historique',contentHash:digest,
    chapter:{manuscriptId:edition}}));
  const plan=planSnapshotFork(parsed,edition,revisions);
  assert.deepEqual(plan.map(row=>row.partId),[part,part]);
  const changed={...v2,parts:[{id:part,title:'Titre retouché après snapshot'}]};
  assert.notEqual(manifestHash(parseSnapshotManifest(changed)),manifestHash(parsed));
});

test('v2 rejects broken parts, disjoint membership and duplicate slots',()=>{
  const v2={schema:'bookstudio.snapshot.v2',editionId:edition,
    parts:[{id:part,title:'Une partie'}],
    chapters:[{...baseChapter(c1,0),partId:part},
      {...baseChapter(c2,1),partId:null}]};
  const refuses=value=>assert.throws(()=>parseSnapshotManifest(value),/SNAPSHOT_INVALID/);
  refuses({...v2,parts:[...v2.parts,v2.parts[0]]});
  refuses({...v2,parts:[{id:part,title:''}]});
  refuses({...v2,chapters:[{...baseChapter(c1,0),partId:edition}]});
  refuses({...v2,chapters:[{...baseChapter(c1,0),partId:part},
    {...baseChapter(c2,0),partId:part}]});
  const third='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
  refuses({...v2,chapters:[{...baseChapter(c1,0),partId:part},
    {...baseChapter(c2,1),partId:null},
    {...baseChapter(third,2),partId:part}]});
});
