import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planChapterMerge,CHAPTER_MERGE_MAX_BYTES,nextChapterPosition}
 from './chapter-merge.ts';
const rev=(sequence,content)=>({
 sequence,content,text:'saved-text',
 contentHash:createHash('sha256').update(JSON.stringify(content)).digest('hex')
});
const text=s=>({type:'text',text:s});
test('two ProseMirror documents join in user-selected order and keep rich marks',()=>{
 const a=rev(3,{type:'doc',content:[
   {type:'heading',attrs:{level:2},content:[text('Introduction')]},
   {type:'paragraph',content:[{type:'text',text:'texte en gras',
     marks:[{type:'bold'}]}]}
 ]});
 const b=rev(7,{type:'doc',content:[
   {type:'blockquote',content:[{type:'paragraph',content:[text('Citation sûre')]}]},
   {type:'paragraph',content:[{type:'text',text:'une référence',
     marks:[{type:'link',attrs:{href:'https://example.org'}}]}]}
 ]});
 const plan=planChapterMerge(a,b,3,7);
 assert.deepEqual(plan.content.content,[...a.content.content,...b.content.content]);
 assert.equal(plan.blockCount,4);
 assert.equal(plan.content.content[1].content[0].marks[0].type,'bold');
 assert.equal(plan.content.content[3].content[0].marks[0].attrs.href,'https://example.org');
 assert.equal(plan.text,'Introduction\ntexte en gras\nCitation sûre\n\nune référence');
 assert.equal(plan.contentHash,createHash('sha256').update(JSON.stringify(plan.content)).digest('hex'));
 assert.equal(a.sequence,3);
 assert.equal(nextChapterPosition(null),0);
 assert.equal(nextChapterPosition(12),13);
});
test('fails closed on missing revision, unsafe document and oversized merge',()=>{
 const p={type:'doc',content:[{type:'paragraph',content:[text('A')]}]};
 assert.throws(()=>planChapterMerge(rev(1,p),rev(0,p),0,0),/CHAPTER_MERGE_SOURCE_INVALID/);
 assert.throws(()=>planChapterMerge(rev(1,p),rev(0,{type:'doc',content:[
   {type:'paragraph',content:[{type:'text',text:'x',marks:[
     {type:'link',attrs:{href:'javascript:alert(1)'}}]}]}
 ]}),1,0),/CHAPTER_MERGE_SOURCE_INVALID/);
 const many='a'.repeat(Math.floor(CHAPTER_MERGE_MAX_BYTES/2)+150);
 const huge={type:'doc',content:[{type:'paragraph',content:[text(many)]}]};
 assert.throws(()=>planChapterMerge(rev(0,huge),rev(0,huge),0,0),
   /CHAPTER_MERGE_TOO_LARGE/);
 assert.throws(()=>nextChapterPosition(2147483647),/CHAPTER_COPY_TOO_LARGE/);
});
