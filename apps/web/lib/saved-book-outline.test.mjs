import test from 'node:test';
import assert from 'node:assert/strict';
import {savedBookOutlinePage,validSavedOutlineQuery,SAVED_OUTLINE_PAGE_SIZE}
 from './saved-book-outline.ts';

const h=(level,...runs)=>({type:'heading',attrs:{level},content:runs.map(text=>({type:'text',text}))});
test('global heading ordinals preserve document order, markup, accents and repeats',()=>{
 const doc={type:'doc',content:[
  {type:'paragraph',content:[{type:'text',text:'Confidentiel — jamais retourné'}]},
  h(1,'Introduction'),h(2,'Santé ','publique'),h(3,'Santé publique'),h(4,'Ignoré'),h(2,''),
  {type:'bulletList',content:[{type:'listItem',content:[h(3,'Résultats 🩺')]}]}
 ]};
 const original=JSON.stringify(doc);
 const page=savedBookOutlinePage(doc);
 assert.deepEqual(page.headings.map(x=>[x.ordinal,x.level,x.title]),[
  [0,1,'Introduction'],[1,2,'Santé publique'],[2,3,'Santé publique'],[3,3,'Résultats 🩺']]);
 assert.equal(page.total,4);
 assert.deepEqual(savedBookOutlinePage(doc,'SANTÉ').headings.map(x=>x.ordinal),[1,2]);
 assert.equal(JSON.stringify(doc),original);
 assert.equal(JSON.stringify(page).includes('Confidentiel'),false);
});

test('pagination is explicit and filtered ordinal remains stable beyond 60 headings',()=>{
 const doc={type:'doc',content:Array.from({length:SAVED_OUTLINE_PAGE_SIZE+7},
  (_,i)=>h(1,'Section '+(i+1)))};
 const first=savedBookOutlinePage(doc);
 assert.equal(first.headings.length,SAVED_OUTLINE_PAGE_SIZE);
 assert.equal(first.total,SAVED_OUTLINE_PAGE_SIZE+7);
 assert.equal(first.hasMore,true);
 const later=savedBookOutlinePage(doc,'',SAVED_OUTLINE_PAGE_SIZE);
 assert.deepEqual(later.headings.map(x=>x.ordinal),[60,61,62,63,64,65,66]);
 assert.equal(later.hasMore,false);
 assert.deepEqual(savedBookOutlinePage(doc,'Section 67').headings.map(x=>x.ordinal),[66]);
 assert.equal(savedBookOutlinePage({type:'doc',content:[]}).total,0);
});

test('invalid offsets and control-character filters rejected',()=>{
 for(const offset of [-1,1.5,Number.MAX_SAFE_INTEGER,NaN]){
  assert.equal(validSavedOutlineQuery('',offset),false);
  assert.throws(()=>savedBookOutlinePage({},'',offset),/OUTLINE_QUERY_INVALID/);
 }
 for(const filter of ['\n','\0','x'.repeat(101)]){
  assert.equal(validSavedOutlineQuery(filter,0),false);
  assert.throws(()=>savedBookOutlinePage({},filter),/OUTLINE_QUERY_INVALID/);
 }
});
