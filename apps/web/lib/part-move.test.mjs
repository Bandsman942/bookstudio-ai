import test from 'node:test';
import assert from 'node:assert/strict';
import {movePartBlock,partBlockPositionChanges,partMoveToken} from './part-move.ts';

const rows=(...ids)=>ids.map((partId,index)=>({id:String(index),partId,position:index*2}));
test('move an entire adjacent part above or below without splitting it',()=>{
 const original=rows('a','a','b','b','b','c');
 const before=JSON.stringify(original);
 const moved=movePartBlock(original,'b','up');
 assert.deepEqual(moved?.map(c=>c.partId),['b','b','b','a','a','c']);
 assert.deepEqual(movePartBlock(original,'a','down')?.map(c=>c.id),moved?.map(c=>c.id));
 assert.deepEqual(movePartBlock(moved,'b','down')?.map(c=>c.id),original.map(c=>c.id));
 assert.equal(JSON.stringify(original),before,'pure rearrangement cannot mutate text/history');
});
test('unassigned chapters are a movable neighbouring group',()=>{
 const list=rows(null,null,'a','a',null,'b','b');
 assert.deepEqual(movePartBlock(list,'a','up')?.map(c=>c.partId),
  ['a','a',null,null,null,'b','b']);
 assert.deepEqual(movePartBlock(list,'a','down')?.map(c=>c.partId),
  [null,null,null,'a','a','b','b']);
 assert.deepEqual(movePartBlock(list,'b','up')?.map(c=>c.partId),
  [null,null,'a','a','b','b',null]);
});
test('empty parts, manuscript edges and split groups never move',()=>{
 assert.equal(movePartBlock(rows('a','a','b'),'a','up'),null);
 assert.equal(movePartBlock(rows('a','a','b'),'b','down'),null);
 assert.equal(movePartBlock(rows('a','b','a'),'a','down'),null);
 assert.equal(movePartBlock(rows(null,null),'missing','up'),null);
 assert.equal(movePartBlock([],'missing','up'),null);
});
test('slot changes preserve exact active positions and all row identities',()=>{
 const initial=rows('a','a','b','b','c');
 const result=movePartBlock(initial,'b','up');
 const updates=partBlockPositionChanges(initial,result);
 assert.deepEqual(updates,[
  {id:'2',from:4,to:0},{id:'3',from:6,to:2},
  {id:'0',from:0,to:4},{id:'1',from:2,to:6}
 ]);
 assert.deepEqual([...new Set(result.map(c=>c.id))].sort(),
  initial.map(c=>c.id).sort());
 assert.deepEqual(partBlockPositionChanges(initial,initial),[]);
 assert.equal(partBlockPositionChanges(initial,initial.slice(1)),null);
 assert.equal(partBlockPositionChanges(initial,[initial[0],initial[0],...initial.slice(2)]),null);
});
test('optimistic move token protects membership as well as chapter order',()=>{
 const uuids=['a','b','c'].map(c=>c.repeat(8)+'-'+c.repeat(4)+'-4'+c.repeat(3)+'-a'+c.repeat(3)+'-'+c.repeat(12));
 const list=rows('part-a','part-a','part-b').map((r,index)=>({...r,id:uuids[index]}));
 assert.match(partMoveToken(list),/^[0-9a-f]{64}$/);
 assert.notEqual(partMoveToken(list),partMoveToken(list.map((r,index)=>
  index===1?{...r,partId:'part-b'}:r)));
 assert.notEqual(partMoveToken(list),partMoveToken(movePartBlock(list,'part-b','up')));
});
