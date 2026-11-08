import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSavedRevisionText,REVISION_DIFF_MAX_CELLS}
 from './chapter-revision-diff.ts';
const join=(diff,kind)=>diff.segments.filter(s=>s.kind===kind).map(s=>s.text).join('');
const original=(diff)=>diff.segments.filter(s=>s.kind!=='added').map(s=>s.text).join('');
const updated=(diff)=>diff.segments.filter(s=>s.kind!=='removed').map(s=>s.text).join('');
test('word changes preserve exact accents, punctuation and whitespace',()=>{
 const left='Bonjour le monde !\nEt demain ?',right='Bonjour notre monde !\nEt demain.';
 const diff=compareSavedRevisionText(left,right);
 assert.equal(original(diff),left);assert.equal(updated(diff),right);
 assert.ok(diff.counts.added>0&&diff.counts.removed>0);
 assert.equal(diff.algorithm,'word-lcs-bounded-v1');
});
test('identical texts, formatting-only changes and empty manuscripts',()=>{
 const unchanged=compareSavedRevisionText('Même texte.','Même texte.','a','b');
 assert.equal(unchanged.counts.added,0);assert.equal(unchanged.counts.removed,0);
 assert.equal(unchanged.formattingMayDiffer,true);
 assert.deepEqual(unchanged.segments,[{kind:'equal',text:'Même texte.'}]);
 assert.deepEqual(compareSavedRevisionText('','').segments,[]);
});
test('additions/deletions at both ends and reverse comparison',()=>{
 for(const [a,b] of [['','Ajout complet'],['Enlevé',''],['a b c','a x b c'],['x a b','a b'],
 ['x  x\n','x y x\n'],['🎵 café','🎶 café']]){
   const diff=compareSavedRevisionText(a,b);
   assert.equal(original(diff),a);
   assert.equal(updated(diff),b);
 }
});
test('strict size/memory work budget: never silently truncate',()=>{
 assert.throws(()=>compareSavedRevisionText('x'.repeat(250001),'a'),
   /REVISION_COMPARISON_TOO_LARGE/);
 const a='a '.repeat(2500),b='b '.repeat(2500);
 assert.ok(2500*2500>REVISION_DIFF_MAX_CELLS);
 assert.throws(()=>compareSavedRevisionText(a,b),/REVISION_COMPARISON_TOO_LARGE/);
 const same='texte '.repeat(3000);
 assert.equal(compareSavedRevisionText(same,same).counts.removed,0,
   'large unchanged prefix is optimized before dynamic matrix');
});
