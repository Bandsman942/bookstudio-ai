import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterOrderToken,nextChapterOrder} from './chapter-order.ts';
const ids=['a','b','c'].map(x=>x.repeat(8)+'-'+x.repeat(4)+'-4'+x.repeat(3)+'-a'+x.repeat(3)+'-'+x.repeat(12));
const ordered=ids.map((id,position)=>({id,position}));
test('optimistic token binds all ordered positions and changes on swaps',()=>{
 const original=chapterOrderToken(ordered);
 assert.match(original,/^[0-9a-f]{64}$/);
 assert.equal(original,chapterOrderToken(ordered));
 assert.notEqual(original,chapterOrderToken([{...ordered[0],position:2},ordered[1],ordered[2]]));
 assert.notEqual(original,chapterOrderToken([ordered[1],ordered[0],ordered[2]]));
});
test('moving by one place never drops or mutates chapter identity',()=>{
 const moved=nextChapterOrder(ordered,ids[1],'up');
 assert.deepEqual(moved?.map(x=>x.id),[ids[1],ids[0],ids[2]]);
 assert.deepEqual(ordered.map(x=>x.id),ids,'input remains immutable');
 assert.deepEqual(nextChapterOrder(ordered,ids[0],'up'),ordered,'top edge no-op');
 assert.deepEqual(nextChapterOrder(ordered,ids[2],'down'),ordered,'bottom edge no-op');
 assert.equal(nextChapterOrder(ordered,'missing','up'),null);
});
test('collision-safe order digest includes positions, not manuscript text',()=>{
 assert.notEqual(chapterOrderToken([{id:ids[0],position:0},{id:ids[1],position:0}]),
   chapterOrderToken([{id:ids[0],position:0},{id:ids[1],position:1}]));
 assert.throws(()=>chapterOrderToken([{id:ids[0],position:-1}]),/INVALID/);
});
test('moving rows preserves part metadata needed to validate grouping',()=>{
 const grouped=ordered.map((chapter,index)=>({
  ...chapter,partId:index<2?'first':'second',title:'Chapter '+index
 }));
 const moved=nextChapterOrder(grouped,ids[1],'down');
 assert.deepEqual(moved?.map(row=>row.partId),['first','second','first']);
 assert.deepEqual(moved?.map(row=>row.title),['Chapter 0','Chapter 2','Chapter 1']);
 assert.deepEqual(grouped.map(row=>row.partId),['first','first','second']);
});
