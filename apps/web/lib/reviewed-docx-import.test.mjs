import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareReviewedDocxImport,ReviewedImportError} from './reviewed-docx-import.ts';
const id='123e4567-e89b-42d3-a456-426614174000';
const make=()=>({sourceName:id+'-roman.docx',operationId:id,title:'Chapitre premier',
 confirm:'IMPORT_REVIEWED_DOCX',acknowledged:true,truncated:false,
 blocks:[{kind:'heading',text:'Le début'},{kind:'paragraph',text:'Texte <script> conservé comme caractères.'}]});
function refuses(body,code){assert.throws(()=>prepareReviewedDocxImport(body),
 e=>e instanceof ReviewedImportError&&e.code===code);}
test('approved DOCX becomes safe, text-only Tiptap content',()=>{
 const p=prepareReviewedDocxImport(make());
 assert.equal(p.title,'Chapitre premier');
 assert.deepEqual(p.content.content[0],{type:'heading',attrs:{level:2},
   content:[{type:'text',text:'Le début'}]});
 assert.match(p.text,/<script>/);
 assert.doesNotMatch(JSON.stringify(p.content),/type":"link"/);
});
test('explicit review and untruncated preview are mandatory',()=>{
 refuses({...make(),acknowledged:false},'DOCX_REVIEW_REQUIRED');
 refuses({...make(),truncated:true},'DOCX_PREVIEW_TRUNCATED');
 refuses({...make(),confirm:'IMPORT_SILENTLY'},'DOCX_REVIEW_REQUIRED');
});
test('source and id must be valid private DOCX identifiers',()=>{
 refuses({...make(),sourceName:'../../hack.docx'},'DOCX_SOURCE_INVALID');
 refuses({...make(),sourceName:id+'-fake.png'},'DOCX_SOURCE_INVALID');
 refuses({...make(),operationId:'bad'},'DOCX_OPERATION_INVALID');
});
test('rejects invalid and oversized blocks',()=>{
 refuses({...make(),blocks:[]},'DOCX_BLOCKS_INVALID');
 refuses({...make(),blocks:Array.from({length:201},()=>({kind:'paragraph',text:'a'}))},'DOCX_BLOCKS_INVALID');
 refuses({...make(),blocks:[{kind:'paragraph',text:'a'.repeat(10001)}]},'DOCX_BLOCKS_INVALID');
 refuses({...make(),blocks:[{kind:'raw_html',text:'<iframe>'}]},'DOCX_BLOCKS_INVALID');
});
