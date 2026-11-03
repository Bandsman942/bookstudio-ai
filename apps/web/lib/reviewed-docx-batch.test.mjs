import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareReviewedDocxBatch,deriveBatchOperationId} from './reviewed-docx-batch.ts';
import {ReviewedImportError} from './reviewed-docx-import.ts';
const id='123e4567-e89b-42d3-a456-426614174000';
const src=id+'-roman.docx';
const make=()=>({batchId:id,sourceName:src,confirm:'IMPORT_REVIEWED_DOCX_BATCH',
 acknowledged:true,truncated:false,chapters:[
  {title:'Chapitre 1',blocks:[{kind:'heading',text:'Chapitre 1'},{kind:'paragraph',text:'Texte A'}]},
  {title:'Chapitre 2',blocks:[{kind:'heading',text:'Chapitre 2'},{kind:'paragraph',text:'Texte B'}]}
 ]});
function refuses(input,code){assert.throws(()=>prepareReviewedDocxBatch(input),
 e=>e instanceof ReviewedImportError&&e.code===code);}
test('batch derives two unique stable UUIDs and preserves ordered text',()=>{
 const b=prepareReviewedDocxBatch(make());
 assert.equal(b.chapters.length,2);
 assert.notEqual(b.chapters[0].operationId,b.chapters[1].operationId);
 assert.deepEqual(b.chapters.map(x=>x.operationId),[deriveBatchOperationId(id,0),deriveBatchOperationId(id,1)]);
 assert.match(b.chapters[0].text,/Texte A/);
});
test('batch demands complete explicit review, 2-10 chapters and valid IDs',()=>{
 refuses({...make(),acknowledged:false},'DOCX_REVIEW_REQUIRED');
 refuses({...make(),truncated:true},'DOCX_PREVIEW_TRUNCATED');
 refuses({...make(),chapters:[make().chapters[0]]},'DOCX_BATCH_COUNT_INVALID');
 refuses({...make(),chapters:Array.from({length:11},()=>make().chapters[0])},'DOCX_BATCH_COUNT_INVALID');
 refuses({...make(),batchId:'../../steal'},'DOCX_BATCH_INVALID');
 refuses({...make(),sourceName:'fake.docx'},'DOCX_SOURCE_INVALID');
});
test('malformed and oversized chapters cannot be committed',()=>{
 const input=make();input.chapters[1].blocks[0].kind='iframe';
 refuses(input,'DOCX_BLOCKS_INVALID');
 const huge=make();huge.chapters[0].blocks=Array.from({length:200},()=>({kind:'paragraph',text:'X'}));
 refuses(huge,'DOCX_BATCH_TOO_LARGE');
});
