import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const base=process.env.E2E_BASE_URL||'http://localhost:3000';
const origin=new URL(base).origin;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function request(path,{method='GET',body,cookie,omitOrigin=false,originOverride=null}={}){
  const headers={...(omitOrigin?{}:{Origin:originOverride||origin}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})};
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
assert.equal(versionResponse.data.version,'0.4.0','semver traceability');
assert.equal(versionResponse.data.tag,'v0.4.0');
assert.equal(versionResponse.data.channel,'alpha');
// A second explicitly configured origin must be accepted; arbitrary origins rejected.
const alternate=await request('/api/v1/auth/login',{method:'POST',originOverride:'http://localhost:3001',body:{email:'nobody@example.invalid',password:'wrong'}});
assert.equal(alternate.status,401,'configured extra Origin accepted');
const rogueOrigin=await request('/api/v1/auth/login',{method:'POST',originOverride:'https://unauthorized.example.invalid',body:{email:'nobody@example.invalid',password:'wrong'}});
assert.equal(rogueOrigin.status,403,'unlisted Origin denied');
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
assert.ok(bookId&&chapterId);
// Safe archive/restore lifecycle: no deletion of source, revisions or snapshots.
const archival=await request('/api/v1/books',{method:'POST',cookie:author,body:{title:'Ouvrage à archiver',bookType:'ESSAY',language:'fr'}});
assert.equal(archival.status,201,'create secondary book for lifecycle testing');
const archiveBookId=archival.data.book.id;
const archiveChapterId=archival.data.book.chapterId;
const archivePath='/api/v1/books/'+archiveBookId;
const initialBooks=await request('/api/v1/books',{cookie:author});
assert.equal(initialBooks.status,200);
const archiveOriginal=initialBooks.data.books.find(b=>b.id===archiveBookId);
assert.ok(archiveOriginal?.updatedAt,'book should have concurrency token');
const renamed=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'rename',title:'Ouvrage renommé',expectedUpdatedAt:archiveOriginal.updatedAt
}});
assert.equal(renamed.status,200,'book rename accepted');
assert.equal(renamed.data.book.title,'Ouvrage renommé');
const outdatedRename=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'rename',title:'Titre concurrent interdit',expectedUpdatedAt:archiveOriginal.updatedAt
}});
assert.equal(outdatedRename.status,409,'stale title edit must be refused');
const outsiderRename=await request(archivePath,{method:'PATCH',cookie:outsider,body:{
  action:'rename',title:'Titre pirate',expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(outsiderRename.status,404,'unauthorized book rename denied');
const noOriginArchive=await request(archivePath,{method:'PATCH',cookie:author,omitOrigin:true,body:{
  action:'archive',expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(noOriginArchive.status,403,'archive CSRF enforced');
const archived=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'archive',expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(archived.status,200,'soft archive accepted');
const liveList=await request('/api/v1/books',{cookie:author});
assert.equal(liveList.status,200);
assert.equal(liveList.data.books.some(b=>b.id===archiveBookId),false,'archived book excluded from active library');
const archiveList=await request('/api/v1/books?archived=1',{cookie:author});
assert.equal(archiveList.status,200);
assert.equal(archiveList.data.books.some(b=>b.id===archiveBookId),true,'book accessible in own archives');
const outsiderArchives=await request('/api/v1/books?archived=1',{cookie:outsider});
assert.equal(outsiderArchives.status,200);
assert.equal(outsiderArchives.data.books.some(b=>b.id===archiveBookId),false,'archive access isolated');
const archivedChapter=await request(archivePath+'/chapters/'+archiveChapterId,{cookie:author});
assert.equal(archivedChapter.status,404,'archived chapters not directly accessible');
const restoredBook=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'restore',expectedUpdatedAt:archived.data.book.updatedAt
}});
assert.equal(restoredBook.status,200,'restore without data loss');
assert.equal(restoredBook.data.book.title,'Ouvrage renommé');
const restoredArchivalChapter=await request(archivePath+'/chapters/'+archiveChapterId,{cookie:author});
assert.equal(restoredArchivalChapter.status,200,'chapter retained after archive and restore');
// Metadata commands from contextual chapter menus never alter revision history.
const chapterIndex=await request(archivePath+'/chapters',{cookie:author});
assert.equal(chapterIndex.status,200,'chapter list available');
const archiveChapterIndex=chapterIndex.data.chapters.find(c=>c.id===archiveChapterId);
assert.ok(archiveChapterIndex?.updatedAt,'chapter metadata concurrency token included');
const chapterMetaPath=archivePath+'/chapters/'+archiveChapterId+'/metadata';
const chapterRenamed=await request(chapterMetaPath,{method:'PATCH',cookie:author,body:{
  title:'Chapitre renommé sans toucher le texte',expectedUpdatedAt:archiveChapterIndex.updatedAt
}});
assert.equal(chapterRenamed.status,200,'chapter can be renamed');
assert.equal(chapterRenamed.data.chapter.title,'Chapitre renommé sans toucher le texte');
assert.equal(chapterRenamed.data.chapter.revision,0,'renaming does not create a document revision');
const chapterStale=await request(chapterMetaPath,{method:'PATCH',cookie:author,body:{
  title:'Ancien titre concurrent',expectedUpdatedAt:archiveChapterIndex.updatedAt
}});
assert.equal(chapterStale.status,409,'chapter title optimistic concurrency');
const chapterOutsider=await request(chapterMetaPath,{method:'PATCH',cookie:outsider,body:{
  title:'Tentative non autorisée',expectedUpdatedAt:chapterRenamed.data.chapter.updatedAt
}});
assert.equal(chapterOutsider.status,404,'chapter metadata isolated by membership');
const chapterCsrf=await request(chapterMetaPath,{method:'PATCH',cookie:author,omitOrigin:true,body:{
  title:'Tentative CSRF',expectedUpdatedAt:chapterRenamed.data.chapter.updatedAt
}});
assert.equal(chapterCsrf.status,403,'chapter metadata CSRF enforced');
const chapterInvalid=await request(chapterMetaPath,{method:'PATCH',cookie:author,body:{
  title:'a',expectedUpdatedAt:chapterRenamed.data.chapter.updatedAt
}});
assert.equal(chapterInvalid.status,400,'chapter title validation');
const chapterAfterRename=await request(archivePath+'/chapters/'+archiveChapterId,{cookie:author});
assert.equal(chapterAfterRename.status,200);
assert.equal(chapterAfterRename.data.chapter.title,'Chapitre renommé sans toucher le texte');
assert.equal(chapterAfterRename.data.chapter.revision,0);
assert.deepEqual(chapterAfterRename.data.chapter.content,restoredArchivalChapter.data.chapter.content,'title rename preserves all text');

const restoredList=await request('/api/v1/books',{cookie:author});
assert.equal(restoredList.data.books.some(b=>b.id===archiveBookId),true,'restored book returned to library');
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
// P0 private search must only return latest saved revision and own workspaces.
const searchEndpoint='/api/v1/search';
const hits=await request(searchEndpoint+'?q=Premier',{cookie:author});
assert.equal(hits.status,200,'private search succeeds');
assert.equal(hits.data.hits.some(hit=>hit.bookId===bookId&&hit.chapterId===chapterId&&hit.revision===1),true,'indexed current manuscript');
const noLeak=await request(searchEndpoint+'?q=Premier',{cookie:outsider});
assert.equal(noLeak.status,200,'outsider can search only own workspace');
assert.equal(noLeak.data.hits.some(hit=>hit.bookId===bookId),false,'no cross-tenant search leak');
const unauthSearch=await request(searchEndpoint+'?q=Premier');
assert.equal(unauthSearch.status,401,'unauthenticated search denied');
const wildcardSearch=await request(searchEndpoint+'?q='+encodeURIComponent('%_'),{cookie:author});
assert.equal(wildcardSearch.status,200);
assert.equal(wildcardSearch.data.hits.some(hit=>hit.bookId===bookId),false,'LIKE wildcards escaped');
const invalidSearch=await request(searchEndpoint+'?q=a',{cookie:author});
assert.equal(invalidSearch.status,400,'short search rejected');
// Simple editorial comments preserve revision identity and never leak between workspaces.
const commentsPath='/api/v1/books/'+bookId+'/chapters/'+chapterId+'/comments';
const newComment=await request(commentsPath,{method:'POST',cookie:author,body:{
  body:'Vérifier les sources bibliographiques avant publication.',baseRevision:1
}});
assert.equal(newComment.status,201,'create editorial comment');
const commentId=newComment.data.comment.id;
const commentsList=await request(commentsPath,{cookie:author});
assert.equal(commentsList.status,200,'list own comments');
assert.equal(commentsList.data.comments.some(c=>c.id===commentId && c.stale===false),true,'comment anchored to current revision');
const outsiderComments=await request(commentsPath,{cookie:outsider});
assert.equal(outsiderComments.status,404,'cross-tenant comments list denied');
const outsiderCommentWrite=await request(commentsPath,{method:'POST',cookie:outsider,body:{
  body:'Accès non autorisé',baseRevision:1
}});
assert.equal(outsiderCommentWrite.status,404,'cross-tenant comment creation denied');
const commentCSRF=await request(commentsPath,{method:'POST',cookie:author,omitOrigin:true,body:{
  body:'Interdit par CSRF',baseRevision:1
}});
assert.equal(commentCSRF.status,403,'comment CSRF enforced');
const badAnchor=await request(commentsPath,{method:'POST',cookie:author,body:{
  body:'Ancre trompeuse',baseRevision:1,quote:'INEXISTANT',startOffset:0,endOffset:10
}});
assert.equal(badAnchor.status,409,'incorrect text anchor rejected');
const invalidComment=await request(commentsPath,{method:'POST',cookie:author,body:{body:'x',baseRevision:1}});
assert.equal(invalidComment.status,400,'comment validation');
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
const staleList=await request(commentsPath,{cookie:author});
assert.equal(staleList.status,200);
assert.equal(staleList.data.comments.some(c=>c.id===commentId && c.stale===true),true,'comment must require human re-anchoring after edit');
const staleCommentWrite=await request(commentsPath,{method:'POST',cookie:author,body:{
  body:'Commentaire sur mauvaise révision',baseRevision:1
}});
assert.equal(staleCommentWrite.status,409,'stale comment base rejected');
const resolutionPath=commentsPath+'/'+commentId;
const outsiderResolution=await request(resolutionPath,{method:'PATCH',cookie:outsider,body:{status:'RESOLVED'}});
assert.equal(outsiderResolution.status,404,'cross-tenant comment resolution denied');
const resolve=await request(resolutionPath,{method:'PATCH',cookie:author,body:{status:'RESOLVED'}});
assert.equal(resolve.status,200,'editor can resolve comment');
const listResolved=await request(commentsPath,{cookie:author});
assert.equal(listResolved.data.comments.find(c=>c.id===commentId)?.status,'RESOLVED');

const oldRevisionSearch=await request(searchEndpoint+'?q=Premier',{cookie:author});
assert.equal(oldRevisionSearch.status,200);
assert.equal(oldRevisionSearch.data.hits.some(hit=>hit.bookId===bookId),false,'superseded text not exposed');
const newRevisionSearch=await request(searchEndpoint+'?q=récupérable',{cookie:author});
assert.equal(newRevisionSearch.status,200);
assert.equal(newRevisionSearch.data.hits.some(hit=>hit.bookId===bookId&&hit.revision===2),true,'latest revision indexed immediately');
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
const restoredSearch=await request(searchEndpoint+'?q=Premier',{cookie:author});
assert.equal(restoredSearch.status,200);
assert.equal(restoredSearch.data.hits.some(hit=>hit.bookId===bookId&&hit.revision===3),true,'search reflects restoration without stale content');
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
console.log('E2E API PASS: auth, throttle, CSRF, private search, revision-safe comments, reversible book lifecycle, snapshots, restoration, exports and ACL');
