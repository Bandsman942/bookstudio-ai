import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSource,MAX_SOURCE_BYTES,isBookId,filePath,isStoredName} from './supabase-storage.ts';

const BOOK='123e4567-e89b-42d3-a456-426614174000';
test('validates document type and size without accepting unsafe filenames',()=>{
  const valid=validateSource({name:'Mon livre.docx',type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',size:250});
  assert.equal(valid?.name,'mon-livre.docx');
  for(const name of ['../test.pdf','script.exe','hidden..pdf','folder/file.docx','\\\\evil.pdf']){
    assert.equal(validateSource({name,size:250,type:''}),null);
  }
  assert.equal(validateSource({name:'a.pdf',size:MAX_SOURCE_BYTES+1,type:'application/pdf'}),null);
  assert.equal(validateSource({name:'a.pdf',size:250,type:'application/x-msdownload'}),null);
});
test('storage paths are scoped to a valid book and opaque server-generated names',()=>{
  assert.equal(isBookId(BOOK),true);
  assert.equal(isStoredName('123e4567-e89b-42d3-a456-426614174000-book.docx'),true);
  assert.equal(isStoredName('../other-book/file.pdf'),false);
  assert.equal(filePath(BOOK,'123e4567-e89b-42d3-a456-426614174000-book.docx'),
    'books/'+BOOK+'/123e4567-e89b-42d3-a456-426614174000-book.docx');
  assert.throws(()=>filePath(BOOK,'../../other.pdf'));
});
