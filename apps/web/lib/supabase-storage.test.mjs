import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSource,MAX_SOURCE_BYTES,isBookId,filePath,isStoredName,signUpload,listFiles,signDownload,deleteFile} from './supabase-storage.ts';

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

test('Supabase private REST signing, listing and deleting have server-side scoped API calls',async()=>{
  const oldFetch=globalThis.fetch;
  const originals={
    SUPABASE_URL:process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY,
    SUPABASE_STORAGE_BUCKET:process.env.SUPABASE_STORAGE_BUCKET
  };
  process.env.SUPABASE_URL='https://nyzvarcnjvfmalfvkelc.supabase.co';
  process.env.SUPABASE_SECRET_KEY='sb_secret_testing_only';
  process.env.SUPABASE_STORAGE_BUCKET='Uploaded_books';
  const name='123e4567-e89b-42d3-a456-426614174000-book.pdf';
  const path='books/'+BOOK+'/'+name;
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    const relative=new URL(url).pathname;
    calls.push({relative,method:options.method,headers:options.headers,body:options.body});
    if(relative.includes('/object/upload/sign/'))return Response.json({url:'/object/upload/sign/Uploaded_books/'+path+'?token=temporary'});
    if(relative.includes('/object/list/'))return Response.json([{name,metadata:{size:1024},created_at:'2026-11-03T00:00:00Z'}]);
    if(relative.includes('/object/sign/'))return Response.json({signedURL:'/object/sign/Uploaded_books/'+path+'?token=download'});
    if(relative==='/storage/v1/object/Uploaded_books'&&options.method==='DELETE')return Response.json([{name}]);
    throw Error('unexpected mock call '+relative);
  };
  try{
    const signed=await signUpload(BOOK,name);
    assert.ok(signed.startsWith(process.env.SUPABASE_URL+'/storage/v1/object/upload/sign/'));
    assert.equal(new URL(signed).searchParams.get('token'),'temporary');
    assert.deepEqual((await listFiles(BOOK)).map(x=>x.name),[name]);
    const download=await signDownload(BOOK,name);
    assert.equal(new URL(download).searchParams.get('token'),'download');
    await deleteFile(BOOK,name);
    assert.equal(calls.length,4);
    for(const call of calls){
      assert.equal(call.headers.apikey,'sb_secret_testing_only');
      assert.ok(call.relative.startsWith('/storage/v1/object/'));
    }
    assert.equal(calls[3].method,'DELETE');
    assert.deepEqual(JSON.parse(calls[3].body),{prefixes:[path]});
  }finally{
    globalThis.fetch=oldFetch;
    for(const [key,value] of Object.entries(originals)){
      if(value===undefined)delete process.env[key];
      else process.env[key]=value;
    }
  }
});
