import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const base=process.env.E2E_BASE_URL||'http://localhost:3000';
const origin=new URL(base).origin;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function request(path,{method='GET',body,cookie,omitOrigin=false}={}){
  const headers={...(omitOrigin?{}:{Origin:origin}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})};
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  const data=await response.json().catch(()=>({}));
  return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]||'',setCookie:response.headers.get('set-cookie')||''};
}
async function ready(){
  for(let i=0;i<90;i++){
    try{const r=await fetch(base,{signal:AbortSignal.timeout(2000)});if(r.status<500)return;}catch{}
    await sleep(1000);
  }
  throw new Error('E2E_SERVER_NOT_READY');
}
await ready();
const healthResponse=await request('/api/health');
assert.equal(healthResponse.status,200,'database readiness');
assert.equal(healthResponse.data.database,'ready');
const versionResponse=await request('/api/version');
assert.equal(versionResponse.status,200,'version route');
assert.equal(versionResponse.data.version,'0.2.0','semver traceability');
assert.equal(versionResponse.data.tag,'v0.2.0');
assert.equal(versionResponse.data.channel,'alpha');
const suffix=randomUUID().slice(0,8);
const password='BookStudio-CI-Private-Only-2026!';

async function user(label){
  const email='e2e-'+label+'-'+suffix+'@example.invalid';
  const signup=await request('/api/v1/auth/register',{method:'POST',body:{email,name:'Auteur '+label,password}});
  assert.equal(signup.status,201,'private test signup');
  const login=await request('/api/v1/auth/login',{method:'POST',body:{email,password}});
  assert.equal(login.status,200,'login');
  assert.ok(login.cookie.startsWith('bookstudio_session='),'private session cookie');
  assert.match(login.setCookie,/HttpOnly/i,'no JS access to cookie');
  assert.match(login.setCookie,/SameSite=Lax/i,'CSRF cookie policy');
  return login.cookie;
}
const bootstrapToken='BookStudio_CI_Owner_Setup_Token_2026_Safe_TestOnly';
const ownerEmail='owner-'+suffix+'@example.invalid';
const ownerPassword='BookStudio-Owner-CI-Test-2026!';
const initialActivation=await request('/api/v1/auth/setup',{method:'POST',body:{
  token:bootstrapToken,email:ownerEmail,name:'Owner E2E',password:ownerPassword
}});
assert.equal(initialActivation.status,201,'first owner activation must succeed');
const activatedLogin=await request('/api/v1/auth/login',{method:'POST',
  body:{email:ownerEmail,password:ownerPassword}});
assert.equal(activatedLogin.status,200,'owner can sign in');
const secondActivation=await request('/api/v1/auth/setup',{method:'POST',
  body:{token:bootstrapToken,email:'other-'+suffix+'@example.invalid',
    name:'Second Owner',password:ownerPassword}});
assert.equal(secondActivation.status,403,'one-time owner activation impossible twice');
const invalidBootstrap=await request('/api/v1/auth/setup',{method:'POST',
  body:{token:'x'.repeat(43),email:'other-'+suffix+'@example.invalid',
    name:'Second Owner',password:ownerPassword}});
assert.equal(invalidBootstrap.status,403,'invalid setup token rejected');
const bootstrapCSRF=await request('/api/v1/auth/setup',{method:'POST',omitOrigin:true,
  body:{token:bootstrapToken,email:'other-'+suffix+'@example.invalid',
    name:'Second Owner',password:ownerPassword}});
assert.equal(bootstrapCSRF.status,403,'setup enforces same-origin policy');
const author=await user('A'),outsider=await user('B');
// Login attempts are shared through PostgreSQL and remain uniform for unknown users.
const unknown='unknown-'+suffix+'@example.invalid';
for(let n=0;n<8;n++){
  const denied=await request('/api/v1/auth/login',{method:'POST',body:{email:unknown,password:'wrong-'+n}});
  assert.equal(denied.status,401,'unknown user does not leak account existence');
}
const throttled=await request('/api/v1/auth/login',{method:'POST',body:{email:unknown,password:'wrong-again'}});
assert.equal(throttled.status,429,'distributed login throttle');
assert.equal(throttled.data.error,'AUTH_RATE_LIMITED');
const csrfLogin=await request('/api/v1/auth/login',{method:'POST',body:{email:unknown,password},omitOrigin:true});
assert.equal(csrfLogin.status,403,'login rejects missing Origin');
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
// Immutable snapshot and non-destructive restoration exercises.
const versionsPath='/api/v1/books/'+bookId+'/snapshots';
const firstVersion=await request(versionsPath,{method:'POST',cookie:author,body:{name:'Avant la révision'}});
assert.equal(firstVersion.status,201,'create snapshot');
assert.equal(firstVersion.data.snapshot.chapterCount,1);
const snapshotId=firstVersion.data.snapshot.id;
const listedVersions=await request(versionsPath,{cookie:author});
assert.equal(listedVersions.status,200);
assert.equal(listedVersions.data.snapshots.some(s=>s.id===snapshotId),true,'snapshot discoverable');
const foreignSnapshot=await request(versionsPath,{cookie:outsider});
assert.equal(foreignSnapshot.status,404,'no cross-tenant snapshot listing');
const nextDoc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Une version plus récente doit rester récupérable.'}]}]};
const secondSave=await request(path,{method:'PATCH',cookie:author,body:{baseRevision:1,content:nextDoc}});
assert.equal(secondSave.status,200,'second revision');
assert.equal(secondSave.data.revision,2);
const restorePath=versionsPath+'/'+snapshotId+'/restore';
const staleRestore=await request(restorePath,{method:'POST',cookie:author,body:{confirm:'RESTORE',expectedRevisions:{[chapterId]:1}}});
assert.equal(staleRestore.status,409,'restoration refuses stale base');
const restored=await request(restorePath,{method:'POST',cookie:author,body:{confirm:'RESTORE',expectedRevisions:{[chapterId]:2}}});
assert.equal(restored.status,200,'restoration accepted');
assert.equal(restored.data.restored,1);
const restoredChapter=await request(path,{cookie:author});
assert.equal(restoredChapter.status,200);
assert.equal(restoredChapter.data.chapter.revision,3,'restoration appends a new revision');
assert.deepEqual(restoredChapter.data.chapter.content,doc,'original text restored');
const notAllowedRestore=await request(restorePath,{method:'POST',cookie:outsider,body:{confirm:'RESTORE',expectedRevisions:{[chapterId]:3}}});
assert.equal(notAllowedRestore.status,404,'no cross-tenant restoration');
// Exports are sourced from verified immutable versions, not mutable editor state.
const wordResponse=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=docx',{headers:{Cookie:author}});
assert.equal(wordResponse.status,200,'Word snapshot export');
assert.match(wordResponse.headers.get('content-type')||'',/wordprocessingml\.document/);
const wordBytes=Buffer.from(await wordResponse.arrayBuffer());
assert.equal(wordBytes.subarray(0,4).toString('hex'),'504b0304','DOCX is ZIP/OXML');
assert.ok(wordBytes.length>700,'DOCX contains document structure');
const pdfResponse=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=pdf',{headers:{Cookie:author}});
assert.equal(pdfResponse.status,200,'PDF snapshot export');
assert.match(pdfResponse.headers.get('content-type')||'',/application\/pdf/);
const pdfBytes=Buffer.from(await pdfResponse.arrayBuffer());
assert.equal(pdfBytes.subarray(0,5).toString('ascii'),'%PDF-','PDF signature');
assert.ok(pdfBytes.length>700,'PDF contains pages');
const strangerPdf=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=pdf',{headers:{Cookie:outsider}});
assert.equal(strangerPdf.status,404,'cross-user PDF export forbidden');
const markdownResponse=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=md',{headers:{Cookie:author}});
assert.equal(markdownResponse.status,200,'Markdown snapshot export');
const markdown=await markdownResponse.text();
assert.ok(markdown.includes('Premier paragraphe rédigé et enregistré.'),'snapshot source preserved in export');
const strangerExport=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=docx',{headers:{Cookie:outsider}});
assert.equal(strangerExport.status,404,'cross-workspace export forbidden');
const noOrigin=await request('/api/v1/books',{method:'POST',cookie:author,body:{title:'Ne doit pas exister'},omitOrigin:true});
assert.equal(noOrigin.status,403,'CSRF prevents cross-origin writes');
const logout=await request('/api/v1/auth/logout',{method:'POST',cookie:author});
assert.equal(logout.status,200,'logout');
const revoked=await request('/api/v1/books',{cookie:author});
assert.equal(revoked.status,401,'revoked sessions cannot access manuscripts');
console.log('E2E API PASS: auth, throttle, CSRF, revisions, immutable snapshots, restoration, DOCX/MD export and ACL');
