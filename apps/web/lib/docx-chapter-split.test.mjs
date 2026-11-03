import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeDocxChapters} from './docx-chapter-split.ts';
const h=(text,style='Heading1')=>({kind:'heading',style,text});
const p=text=>({kind:'paragraph',text});
test('two Heading1 sections create two complete chapters in order',()=>{
 const blocks=[h('Première partie'),p('A'),h('Sous-section','Heading2'),p('B'),
   h('Seconde partie'),p('C')];
 const out=proposeDocxChapters({blocks,truncated:false});
 assert.equal(out.reason,'ok');assert.equal(out.fallbackToHeadings,false);
 assert.equal(out.chapters.length,2);
 assert.deepEqual(out.chapters.flatMap(x=>x.blocks),blocks,'no block omitted or moved');
 assert.deepEqual(out.chapters.map(x=>x.title),['Première partie','Seconde partie']);
});
test('preamble before first heading is preserved as an introduction segment',()=>{
 const blocks=[p('Avant le premier chapitre'),h('Chapitre I'),p('Texte')];
 const out=proposeDocxChapters({blocks,truncated:false});
 assert.equal(out.reason,'ok');
 assert.equal(out.chapters.length,2);
 assert.equal(out.chapters[0].title,'Introduction');
 assert.deepEqual(out.chapters.flatMap(x=>x.blocks),blocks);
});
test('without top-level styles, headings can be proposed with a fallback warning',()=>{
 const out=proposeDocxChapters({blocks:[h('A','Heading2'),p('x'),h('B','Heading2'),p('y')],truncated:false});
 assert.equal(out.reason,'ok');assert.equal(out.fallbackToHeadings,true);
});
test('refuse incomplete, dangerous, excessive or ambiguous proposals',()=>{
 assert.equal(proposeDocxChapters({blocks:[h('A'),h('B')],truncated:true}).reason,'truncated');
 assert.equal(proposeDocxChapters({blocks:[p('A'),p('B')],truncated:false}).reason,'no_headings');
 assert.equal(proposeDocxChapters({blocks:Array.from({length:11},(_,i)=>h('Chapter '+i)),truncated:false},'Introduction',10).reason,'too_many');
 assert.equal(proposeDocxChapters({blocks:[h('A'),{kind:'iframe',text:'oops'}],truncated:false}).reason,'invalid');
 assert.equal(proposeDocxChapters({blocks:[h('A'),p('x'.repeat(10001)),h('B')],truncated:false}).reason,'invalid');
});

test('long manuscripts with 250 paragraphs and 14 headings remain fully segmentable',()=>{
 const blocks=Array.from({length:14},(_,i)=>[h('Chapitre '+(i+1)),...Array.from({length:19},(_,n)=>p('Texte '+i+':'+n+' — '+('a'.repeat(490)))]).flat();
 const out=proposeDocxChapters({blocks,truncated:false});
 assert.equal(out.reason,'ok');assert.equal(out.chapters.length,14);
 assert.deepEqual(out.chapters.flatMap(x=>x.blocks),blocks);
});
