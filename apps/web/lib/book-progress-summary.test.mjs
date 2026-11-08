import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeBookChapters} from './book-progress-summary.ts';
const chapters=[
 {id:'c1',title:'Introduction',updatedAt:'2026-11-08T12:00:00.000Z',revisionSeq:0},
 {id:'c2',title:'Développement',updatedAt:'2026-11-08T13:00:00.000Z',revisionSeq:2},
 {id:'c3',title:'Conclusion',updatedAt:'2026-11-08T14:00:00.000Z',revisionSeq:1}
];
test('writing coverage counts active chapters whose latest saved revision contains text',()=>{
 const input=[{chapterId:'c1',hasText:false},{chapterId:'c2',hasText:true},
   {chapterId:'c3',hasText:true},{chapterId:'foreign',hasText:true}];
 const s=summarizeBookChapters(chapters,input);
 assert.equal(s.activeChapters,3);
 assert.equal(s.writtenChapters,2);
 assert.equal(s.emptyChapters,1);
 assert.equal(s.writingCoveragePercent,67);
 assert.equal(s.latestChapter?.id,'c3');
 assert.deepEqual(s.chapterStates,[
   {chapterId:'c1',hasText:false},{chapterId:'c2',hasText:true},
   {chapterId:'c3',hasText:true}
 ]);
 assert.equal(chapters[0].title,'Introduction','input is never mutated');
});
test('empty book yields zeroes, never misleading 100 percent completion',()=>{
 const s=summarizeBookChapters([],[]);
 assert.equal(s.activeChapters,0);assert.equal(s.writingCoveragePercent,0);
 assert.equal(s.latestChapter,null);
});
test('unsaved/removed chapter cannot be counted by old text state',()=>{
 const s=summarizeBookChapters(chapters.slice(0,2),[
   {chapterId:'c2',hasText:false},{chapterId:'c3',hasText:true}]);
 assert.equal(s.activeChapters,2);
 assert.equal(s.writtenChapters,0);
 assert.equal(s.emptyChapters,2);
});
