import test from 'node:test';
import assert from 'node:assert/strict';
import {partsAreContiguous,assignChapterPart,partBoundaryIndices} from './book-parts.ts';

const rows=(...ids)=>ids.map((partId,index)=>({id:String(index),partId}));
test('parts form contiguous spans, including between unassigned chapters',()=>{
 const value=rows(null,'a','a',null,'b','b',null);
 assert.equal(partsAreContiguous(value),true);
 assert.deepEqual(partBoundaryIndices(value),[1,4]);
 assert.equal(partsAreContiguous(rows('a','b','a')),false);
 assert.equal(partsAreContiguous(rows('a',null,'a')),false);
 assert.equal(partsAreContiguous(rows(null,null,null)),true);
});
test('assigning adjacent chapters preserves order and never mutates input',()=>{
 const initial=rows(null,'a',null,null,'b','b');
 const before=JSON.stringify(initial);
 assert.deepEqual(assignChapterPart(initial,'2','a')?.map(x=>x.partId),
  [null,'a','a',null,'b','b']);
 assert.equal(assignChapterPart(initial,'3','a'),null,
  'a gap inside existing a span must be rejected');
 assert.equal(assignChapterPart(initial,'0','b'),null,
  'b must not be duplicated in a distant span');
 assert.equal(assignChapterPart(initial,'missing','a'),null);
 assert.equal(JSON.stringify(initial),before);
});
