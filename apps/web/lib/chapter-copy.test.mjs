import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planChapterCopy,nextChapterPosition} from './chapter-copy.ts';
const doc=s=>({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:s}]}]});
const data=(seq,text)=>{const content=doc(text);return {
 sequence:seq,content,text,contentHash:createHash('sha256').update(JSON.stringify(content)).digest('hex')
};};
test('copies exactly the selected saved revision, content and hash without mutation',()=>{
 const original=data(8,'Texte révisé. 🗂️');
 const clone=planChapterCopy(original,8);
 assert.deepEqual(clone.content,original.content);
 assert.equal(clone.text,original.text);
 assert.equal(clone.contentHash,original.contentHash);
 assert.equal(original.sequence,8);
 assert.equal(nextChapterPosition(null),0);
 assert.equal(nextChapterPosition(18),19);
});
test('fail-closed on stale, broken, malformed or oversized source',()=>{
 assert.throws(()=>planChapterCopy(data(2,'Bonjour'),1),/CHAPTER_COPY_SOURCE_INVALID/);
 assert.throws(()=>planChapterCopy({...data(1,'Bonjour'),contentHash:'bad'},1),/CHAPTER_COPY_SOURCE_INVALID/);
 assert.throws(()=>planChapterCopy({...data(1,'Bonjour'),content:{type:'evil',content:[]}},1),/CHAPTER_COPY_SOURCE_INVALID/);
 assert.throws(()=>nextChapterPosition(2147483647),/CHAPTER_COPY_TOO_LARGE/);
});
