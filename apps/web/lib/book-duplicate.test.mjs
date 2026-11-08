import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {planBookDuplicate,BOOK_DUPLICATE_MAX_CHAPTERS} from './book-duplicate.ts';
const doc=text=>({type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const chap=(id,position,revisionSeq)=>({id,title:'Chapitre '+id,position,revisionSeq});
const revision=(id,sequence,text)=>({chapterId:id,sequence,
 content:doc(text),text,contentHash:hash(doc(text))});
test('copies exactly current sequence and preserves original positions and content',()=>{
 const chapters=[chap('A',0,2),chap('B',4,0)],revisions=[
   revision('A',2,'Version récente'),revision('B',0,'Texte en deuxième chapitre')];
 const planned=planBookDuplicate(chapters,revisions);
 assert.equal(planned.length,2);
 assert.deepEqual(planned.map(c=>c.position),[0,4]);
 assert.deepEqual(planned.map(c=>c.text),['Version récente','Texte en deuxième chapitre']);
 assert.deepEqual(planned.map(c=>c.content),revisions.map(r=>r.content));
 assert.equal(revisions[0].sequence,2,'source untouched');
});
test('never substitute stale revision, duplicate position or malformed metadata',()=>{
 assert.throws(()=>planBookDuplicate([chap('A',0,2)],[revision('A',1,'Stale')]),
   /BOOK_DUPLICATE_SOURCE_INVALID/);
 assert.throws(()=>planBookDuplicate([chap('A',0,0),chap('B',0,0)],[
   revision('A',0,'A'),revision('B',0,'B')]),/BOOK_DUPLICATE_SOURCE_INVALID/);
 assert.throws(()=>planBookDuplicate([chap('A',0,0)],[]),/BOOK_DUPLICATE_SOURCE_INVALID/);
 assert.throws(()=>planBookDuplicate([chap('A',0,0)],[
   {...revision('A',0,'X'),contentHash:'x'}]),/BOOK_DUPLICATE_SOURCE_INVALID/);
 assert.deepEqual(planBookDuplicate([],[]),[]);
});
test('enforces chapter and bytes budgets without truncating source text',()=>{
 const tooMany=Array.from({length:BOOK_DUPLICATE_MAX_CHAPTERS+1},(_,i)=>chap('C'+i,i,0));
 assert.throws(()=>planBookDuplicate(tooMany,[]),/BOOK_DUPLICATE_TOO_LARGE/);
 const huge='A'.repeat(9*1024*1024);
 assert.throws(()=>planBookDuplicate([chap('A',0,0)],[
   revision('A',0,huge)]),/BOOK_DUPLICATE_SOURCE_INVALID|BOOK_DUPLICATE_TOO_LARGE/);
});
