import test from 'node:test';
import assert from 'node:assert/strict';
import {planCompleteDocxImport,DocxPlanError,DOCX_PART_MAX_BLOCKS} from './docx-full-plan.ts';
const h=(text)=>({kind:'heading',style:'Heading1',text});
const p=text=>({kind:'paragraph',style:'',text});
function all(plan){return plan.batches.flatMap(batch=>batch.parts.flatMap(part=>part.blocks));}
test('a manuscript with over 200 paragraphs is preserved in ordered, resumable batches',()=>{
 const original=Array.from({length:830},(_,i)=>p('Paragraphe '+i+' : '+('a'.repeat(105))));
 const plan=planCompleteDocxImport({blocks:original,truncated:false},'one');
 assert.ok(plan.batches.length>=5);assert.ok(plan.parts.length>=5);
 assert.deepEqual(all(plan),original);
 assert.equal(plan.sourceBlocks,830);
 assert.ok(plan.batches.every(x=>x.blockCount<=DOCX_PART_MAX_BLOCKS));
 assert.ok(plan.continuations>0);
});
test('more than 100,000 characters and more than ten chapters can be segmented without text loss',()=>{
 const original=[];
 for(let i=0;i<17;i++){
   original.push(h('Chapitre '+(i+1)));
   for(let n=0;n<12;n++)original.push(p('Texte '+i+'-'+n+' '+('B'.repeat(620))));
 }
 const plan=planCompleteDocxImport({blocks:original,truncated:false},'sections');
 assert.ok(plan.sourceCharacters>100000);
 assert.equal(plan.hasHeadings,true);
 assert.ok(plan.parts.length>=17);
 assert.ok(plan.batches.length>=2);
 assert.deepEqual(all(plan),original);
});
test('huge source paragraphs split only when parser safely produces <=10k blocks',()=>{
 const blocks=[p('c'.repeat(9000)),p('z'.repeat(9000))];
 const plan=planCompleteDocxImport({blocks,truncated:false},'one');
 assert.equal(plan.sourceCharacters,18000);
 assert.deepEqual(all(plan),blocks);
});
test('no silent processing of truncated or malformed previews',()=>{
 assert.throws(()=>planCompleteDocxImport({blocks:[p('x')],truncated:true},'one'),e=>e instanceof DocxPlanError&&e.code==='DOCX_PREVIEW_TRUNCATED');
 assert.throws(()=>planCompleteDocxImport({blocks:[p('')],truncated:false},'one'),e=>e.code==='DOCX_BLOCKS_INVALID');
 assert.throws(()=>planCompleteDocxImport({blocks:[p('x'.repeat(10001))],truncated:false},'one'),e=>e.code==='DOCX_BLOCKS_INVALID');
});
