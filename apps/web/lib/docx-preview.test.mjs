import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {inspectDocxContainer,previewDocx,DocxPreviewError} from './docx-preview.ts';

const word='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Premier paragraphe</w:t></w:r></w:p></w:body></w:document>';
const types='<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>';
const docx=(extra={})=>zipSync({
  '[Content_Types].xml':strToU8(types),
  'word/document.xml':strToU8(word),...extra
},{level:0});
function rejects(blob,code){
  assert.throws(()=>inspectDocxContainer(blob),e=>e instanceof DocxPreviewError&&e.code===code);
}
test('valid DOCX container accepted, no decompression of unrelated media',()=>{
  const input=docx({'word/media/photo.png':new Uint8Array(1000)});
  const entries=inspectDocxContainer(input);
  assert.ok(entries.some(e=>e.name==='word/document.xml'));
  assert.ok(entries.some(e=>e.name==='word/media/photo.png'));
  assert.throws(()=>previewDocx(input),e=>e.code==='DOCX_BROWSER_ONLY');
});
test('refuses empty, PDF and arbitrary non-ZIP files',()=>{
  rejects(new Uint8Array(0),'DOCX_INVALID_CONTAINER');
  rejects(strToU8('%PDF-1.7'),'DOCX_INVALID_CONTAINER');
  rejects(strToU8('not a docx'),'DOCX_INVALID_CONTAINER');
});
test('refuses missing Word document or content types',()=>{
  const input=zipSync({'word/file.xml':strToU8('bad')},{level:0});
  rejects(input,'DOCX_NOT_WORD');
});
test('refuses macros and active files',()=>{
  rejects(docx({'word/vbaProject.bin':strToU8('macro')}),'DOCX_ACTIVE_CONTENT');
  rejects(docx({'word/media/script.js':strToU8('bad')}),'DOCX_ACTIVE_CONTENT');
});
test('rejects oversized compressed archive before expanding any content',()=>{
  rejects(new Uint8Array(20*1024*1024+1),'DOCX_INVALID_CONTAINER');
});
test('rejects unsafe central directory paths and duplicate names',()=>{
  rejects(docx({'../steal.txt':strToU8('evil')}),'DOCX_UNSAFE_ARCHIVE');
  rejects(docx({'word/../evil.xml':strToU8('evil')}),'DOCX_UNSAFE_ARCHIVE');
});
test('rejects archives with massive claimed expansion',()=>{
  const input=zipSync({'[Content_Types].xml':strToU8(types),
    'word/document.xml':strToU8('A'.repeat(300000))},{level:9});
  rejects(input,'DOCX_ARCHIVE_LIMIT');
});
