import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChapterTargetSearch,CHAPTER_COPY_TARGET_PAGE_SIZE}
 from './chapter-copy-targets.ts';
test('returns a bounded optional trimmed title and fixed page size',()=>{
 assert.equal(CHAPTER_COPY_TARGET_PAGE_SIZE,50);
 assert.equal(parseChapterTargetSearch(new URLSearchParams()),'');
 assert.equal(parseChapterTargetSearch(new URLSearchParams('search=++Livre+médecine++')),
  'Livre médecine');
 assert.equal(parseChapterTargetSearch(new URLSearchParams('search='+encodeURIComponent('a'.repeat(100)))), 'a'.repeat(100));
});
test('rejects duplicates, unknown parameters and overlong searches',()=>{
 for(const q of ['search=x&search=y','foo=1','search='+encodeURIComponent('x'.repeat(101))]){
   assert.throws(()=>parseChapterTargetSearch(new URLSearchParams(q)),
     /CHAPTER_DESTINATION_QUERY_INVALID/);
 }
});
