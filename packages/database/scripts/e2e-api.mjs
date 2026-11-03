import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const base=process.env.E2E_BASE_URL||'http://localhost:3000';
const origin=new URL(base).origin;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function request(path,{method='GET',body,cookie}={}){
  const headers={Origin:origin,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})};
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  const data=await response.json().catch(()=>({}));
  return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
}
async function ready(){
  for(let i=0;i<90;i++){
    try{const r=await fetch(base,{signal:AbortSignal.timeout(2000)});if(r.status<500)return;}catch{}
    await sleep(1000);
  }
  throw new Error('E2E_SERVER_NOT_READY');
}
await ready();
const suffix=randomUUID().slice(0,8);
const password='BookStudio-CI-Private-Only-2026!';

async function user(label){
  const email='e2e-'+label+'-'+suffix+'@example.invalid';
  const signup=await request('/api/v1/auth/register',{method:'POST',body:{email,name:'Auteur '+label,password}});
  assert.equal(signup.status,201,'private test signup');
  const login=await request('/api/v1/auth/login',{method:'POST',body:{email,password}});
  assert.equal(login.status,200,'login');
  assert.ok(login.cookie.startsWith('bookstudio_session='),'secure session cookie');
  return login.cookie;
}
const author=await user('A'),outsider=await user('B');
const created=await request('/api/v1/books',{method:'POST',body:{title:'Essai BookStudio QA',bookType:'SCIENCE',language:'fr'},cookie:author});
assert.equal(created.status,201,'book creation');
const {id:bookId,chapterId}=created.data.book;
assert.ok(bookId&&chapterId);
const path='/api/v1/books/'+bookId+'/chapters/'+chapterId;
const before=await request(path,{cookie:author});
assert.equal(before.status,200,'chapter read');
assert.equal(before.data.chapter.revision,0);
const doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Premier paragraphe rédigé et enregistré.'}]}]};
const save=await request(path,{method:'PATCH',cookie:author,body:{baseRevision:0,content:doc}});
assert.equal(save.status,200,'revision write');
assert.equal(save.data.revision,1);
const conflict=await request(path,{method:'PATCH',cookie:author,body:{baseRevision:0,content:doc}});
assert.equal(conflict.status,409,'stale revision rejected');
const after=await request(path,{cookie:author});
assert.equal(after.status,200);
assert.equal(after.data.chapter.revision,1);
assert.deepEqual(after.data.chapter.content,doc,'roundtrip content');
const othersRead=await request(path,{cookie:outsider});
assert.equal(othersRead.status,404,'no cross-user chapter read');
const othersWrite=await request(path,{method:'PATCH',cookie:outsider,body:{baseRevision:1,content:doc}});
assert.equal(othersWrite.status,404,'no cross-user chapter mutation');
const list=await request('/api/v1/books',{cookie:author});
assert.equal(list.status,200);assert.equal(list.data.books.some(b=>b.id===bookId),true);
const listOther=await request('/api/v1/books',{cookie:outsider});
assert.equal(listOther.status,200);assert.equal(listOther.data.books.some(b=>b.id===bookId),false);
const bad=await request(path,{method:'PATCH',cookie:author,body:{baseRevision:-1,content:doc}});
assert.equal(bad.status,400);
console.log('E2E API PASS: auth, book, chapter, revisions, conflict, ACL and invalid input');
