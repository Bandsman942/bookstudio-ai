import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLibraryFilters,scopeForFilters,encodeLibraryCursor,
  decodeLibraryCursor} from './library-paging.ts';
const id='d1f2ffae-9454-40bf-aeb6-743391110e02';
test('bounded book search, deterministic sort and filters',()=>{
 const raw=new URLSearchParams({q:'  Médecine  ',type:'MEDICINE',status:'WRITING',
   sort:'title',limit:'24'});
 const f=parseLibraryFilters(raw);
 assert.equal(f.q,'Médecine');
 assert.equal(f.limit,24);
 assert.equal(f.archived,false);
 assert.equal(f.sort,'title');
 assert.equal(f.type,'MEDICINE');
 for(const bad of [new URLSearchParams({limit:'101'}),
   new URLSearchParams({limit:'0'}),new URLSearchParams({q:'a'.repeat(81)}),
   new URLSearchParams({sort:'unsafe'}),new URLSearchParams({type:'PRIVATE'}),
   new URLSearchParams({status:'ARCHIVED'}),new URLSearchParams({archived:'0'}),
   new URLSearchParams({cursor:'///'})])
   assert.throws(()=>parseLibraryFilters(bad),/LIBRARY_FILTER_INVALID/);
});
test('book page cursor is scope-bound, deterministic and rejects tampering',()=>{
 const f=parseLibraryFilters(new URLSearchParams({limit:'24',q:'Book',sort:'recent'}));
 const scope=scopeForFilters(f);
 const token=encodeLibraryCursor('recent','2026-11-05T18:00:00.000Z',id,scope);
 assert.deepEqual(decodeLibraryCursor(token,f),{
   v:1,scope,sort:'recent',key:'2026-11-05T18:00:00.000Z',id});
 assert.throws(()=>decodeLibraryCursor(token,{...f,q:'Other'}),/LIBRARY_FILTER_INVALID/);
 assert.throws(()=>decodeLibraryCursor(token,{...f,sort:'title'}),/LIBRARY_FILTER_INVALID/);
 const bad=Buffer.from(JSON.stringify({v:1,scope,sort:'recent',key:'invalid',id})).toString('base64url');
 assert.throws(()=>decodeLibraryCursor(bad,f),/LIBRARY_FILTER_INVALID/);
 const titleFilters=parseLibraryFilters(new URLSearchParams({sort:'title',limit:'3'}));
 const titleCursor=encodeLibraryCursor('title','Édition spéciale',id,scopeForFilters(titleFilters));
 assert.equal(decodeLibraryCursor(titleCursor,titleFilters).key,'Édition spéciale');
});

test('editable-only destination filter is validated and bound to cursor scope',()=>{
 const all=parseLibraryFilters(new URLSearchParams({limit:'20',q:'Manuscrit'}));
 const editable=parseLibraryFilters(new URLSearchParams({editable:'1',limit:'20',q:'Manuscrit'}));
 assert.equal(all.editable,false);
 assert.equal(editable.editable,true);
 assert.notEqual(scopeForFilters(all),scopeForFilters(editable));
 const id='d1f2ffae-9454-40bf-aeb6-743391110e02';
 const c=encodeLibraryCursor('recent','2026-11-05T19:30:00.000Z',id,scopeForFilters(editable));
 assert.deepEqual(decodeLibraryCursor(c,editable).scope,scopeForFilters(editable));
 assert.throws(()=>decodeLibraryCursor(c,all),/LIBRARY_FILTER_INVALID/);
 for(const value of ['false','0','true','2']){
   assert.throws(()=>parseLibraryFilters(new URLSearchParams({editable:value})),/LIBRARY_FILTER_INVALID/);
 }
});
