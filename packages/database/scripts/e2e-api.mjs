import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const release=JSON.parse(await readFile(new URL('../../../release.json',import.meta.url),'utf8'));

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
assert.equal(versionResponse.data.version,release.version,'semver traceability');
assert.equal(versionResponse.data.tag,release.gitTag,'release tag traceability');
assert.equal(versionResponse.data.channel,release.channel,'release channel traceability');
// A second explicitly configured origin must be accepted; arbitrary origins rejected.
const alternate=await request('/api/v1/auth/login',{method:'POST',originOverride:'http://localhost:3001',body:{email:'nobody@example.invalid',password:'wrong'}});
assert.equal(alternate.status,401,'configured extra Origin accepted');
const rogueOrigin=await request('/api/v1/auth/login',{method:'POST',originOverride:'https://unauthorized.example.invalid',body:{email:'nobody@example.invalid',password:'wrong'}});
assert.equal(rogueOrigin.status,403,'unlisted Origin denied');
// No external antivirus worker credentials are enabled in routine CI.
for(const path of ['/api/internal/source-scans/claim','/api/internal/source-scans/report']){
  const noAuth=await request(path,{method:'POST',body:{}});
  assert.equal(noAuth.status,404,'worker endpoint inaccessible to browser');
  const fake=await request(path,{method:'POST',body:{jobId:randomUUID()}});
  assert.equal(fake.status,404,'worker endpoint must not trust client-supplied fields');
}
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
// BS-006b: only explicit, reviewed sources can create a fresh chapter.
const docxImportPath='/api/v1/books/'+bookId+'/import/docx';
const exampleDocx={sourceName:'123e4567-e89b-42d3-a456-426614174000-test.docx',
  operationId:'123e4567-e89b-42d3-a456-426614174001',title:'Chapitre importé',
  confirm:'IMPORT_REVIEWED_DOCX',acknowledged:true,truncated:false,
  blocks:[{kind:'paragraph',text:'Texte inspecté par l’auteur.'}]};
// BS-006c: bulk import needs explicit approval, CSRF, valid batch and write ACL.
const bulkPath=docxImportPath+'/bulk';
const batch={batchId:'123e4567-e89b-42d3-a456-426614174020',
 sourceName:exampleDocx.sourceName,confirm:'IMPORT_REVIEWED_DOCX_BATCH',
 acknowledged:true,truncated:false,
 chapters:[
 {title:'Première partie',blocks:[{kind:'heading',text:'Première partie'},{kind:'paragraph',text:'A'}]},
 {title:'Seconde partie',blocks:[{kind:'heading',text:'Seconde partie'},{kind:'paragraph',text:'B'}]}
 ]};
const bulkCsrf=await request(bulkPath,{method:'POST',cookie:author,omitOrigin:true,body:batch});
assert.equal(bulkCsrf.status,403,'bulk reviewed DOCX requires origin');
const bulkOutsider=await request(bulkPath,{method:'POST',cookie:outsider,body:batch});
assert.equal(bulkOutsider.status,404,'bulk reviewed DOCX enforces workspace');
const bulkAnon=await request(bulkPath,{method:'POST',body:batch});
assert.equal(bulkAnon.status,401,'bulk reviewed DOCX requires login');
const bulkNoConsent=await request(bulkPath,{method:'POST',cookie:author,
 body:{...batch,acknowledged:false}});
assert.equal(bulkNoConsent.status,422,'bulk reviewed DOCX requires consent');
const bulkTruncated=await request(bulkPath,{method:'POST',cookie:author,
 body:{...batch,truncated:true}});
assert.equal(bulkTruncated.status,422,'bulk reviewed DOCX refuses truncated preview');
const bulkTooSmall=await request(bulkPath,{method:'POST',cookie:author,
 body:{...batch,chapters:[batch.chapters[0]]}});
assert.equal(bulkTooSmall.status,422,'multi-chapter mode demands at least two chapters');
const bulkHtml=await request(bulkPath,{method:'POST',cookie:author,
 body:{...batch,chapters:[batch.chapters[0],{title:'Bad',blocks:[{kind:'html',text:'<iframe>'}]}]}});
assert.equal(bulkHtml.status,422,'bulk import rejects active markup kinds');
const docxCSRF=await request(docxImportPath,{method:'POST',cookie:author,omitOrigin:true,body:exampleDocx});
assert.equal(docxCSRF.status,403,'DOCX reviewed import enforces CSRF');
const docxOutsider=await request(docxImportPath,{method:'POST',cookie:outsider,body:exampleDocx});
assert.equal(docxOutsider.status,404,'DOCX reviewed import excludes foreign workspaces');
const docxUnauthenticated=await request(docxImportPath,{method:'POST',body:exampleDocx});
assert.equal(docxUnauthenticated.status,401,'DOCX reviewed import requires login');
const docxNotAcknowledged=await request(docxImportPath,{method:'POST',cookie:author,
  body:{...exampleDocx,acknowledged:false}});
assert.equal(docxNotAcknowledged.status,422,'DOCX import requires explicit reviewed consent');
const docxTruncated=await request(docxImportPath,{method:'POST',cookie:author,
  body:{...exampleDocx,truncated:true}});
assert.equal(docxTruncated.status,422,'incomplete DOCX preview must not be silently imported');
const docxBadPayload=await request(docxImportPath,{method:'POST',cookie:author,
  body:{...exampleDocx,blocks:[{kind:'html',text:'<img onerror=alert(1)>'}]}});
assert.equal(docxBadPayload.status,422,'untrusted active markup rejected by DOCX import');

// Reversible deletion must retain chapter contents, block outsiders and preserve numbering.
// More lifecycle checks run after the secondary book has been restored.
// Safe archive/restore lifecycle: no deletion of source, revisions or snapshots.
const archival=await request('/api/v1/books',{method:'POST',cookie:author,body:{title:'Ouvrage à archiver',bookType:'ESSAY',language:'fr'}});
assert.equal(archival.status,201,'create secondary book for lifecycle testing');
const archiveBookId=archival.data.book.id;
const archiveChapterId=archival.data.book.chapterId;
const progressPath='/api/v1/books/'+bookId+'/progress';
const progressInitial=await request(progressPath,{cookie:author});
assert.equal(progressInitial.status,200,'author can read book progress');
assert.ok(progressInitial.data.progress.activeChapters>=1,'current edition contains chapters');
assert.equal(
  progressInitial.data.progress.activeChapters,
  progressInitial.data.progress.writtenChapters+progressInitial.data.progress.emptyChapters,
  'writing indicators must partition active chapters'
);
assert.equal(typeof progressInitial.data.progress.writingCoveragePercent,'number');
assert.equal(progressInitial.data.progress.editionNumber,1);
assert.equal((await request(progressPath,{cookie:outsider})).status,404,
  'foreign workspace cannot read book progress');
assert.equal((await request(progressPath)).status,401,
  'book progress cannot be read without a session');
const archivePath='/api/v1/books/'+archiveBookId;
const initialBooks=await request('/api/v1/books',{cookie:author});
assert.equal(initialBooks.status,200);
// BS-004c: stable scoped pagination, server-side title/type/status filters.
const firstPage=await request('/api/v1/books?limit=1',{cookie:author});
assert.equal(firstPage.status,200);
assert.equal(firstPage.data.books.length,1);
assert.ok(firstPage.data.total>=2,'all accessible books counted, not first page only');
assert.match(firstPage.data.nextCursor,/^[A-Za-z0-9_-]+$/);
assert.ok(firstPage.data.stats.total>=firstPage.data.total,
  'global counts must represent all visible books');
assert.ok(firstPage.data.stats.byStatus.DRAFT>=2,'dashboard counts ALL draft works');
for(const stage of ['DRAFT','WRITING','REVIEW','APPROVED','PRODUCTION','PUBLISHED'])
  assert.equal(typeof firstPage.data.stats.byStatus[stage],'number','dashboard stage '+stage);
const eligible=await request('/api/v1/books?editable=1&limit=1',{cookie:author});
assert.equal(eligible.status,200);
assert.equal(eligible.data.books.length,1);
assert.equal(eligible.data.total,firstPage.data.total,
  'owner can choose all their active books independent of first-page limit');
assert.equal(eligible.data.books[0].editable,true);
const firstDestination=await request('/api/v1/books?editable=1&sort=title&limit=1',{cookie:author});
assert.equal(firstDestination.status,200);
assert.match(firstDestination.data.nextCursor,/^[A-Za-z0-9_-]+$/);
const nextDestination=await request('/api/v1/books?editable=1&sort=title&limit=1&cursor='+
  firstDestination.data.nextCursor,{cookie:author});
assert.equal(nextDestination.status,200);
assert.notEqual(firstDestination.data.books[0].id,nextDestination.data.books[0].id,
  'import picker can select later pages');
const invalidDestination=await request('/api/v1/books?editable=false',{cookie:author});
assert.equal(invalidDestination.status,400);
const wrongScopeDestination=await request('/api/v1/books?limit=1&cursor='+
  firstDestination.data.nextCursor,{cookie:author});
assert.equal(wrongScopeDestination.status,400,'editable-only cursor cannot be used for public list');
const unrelatedDestination=await request('/api/v1/books?editable=1',{cookie:outsider});
assert.equal(unrelatedDestination.status,200);
assert.ok(unrelatedDestination.data.books.every(b=>b.id!==archiveBookId),
  'source title and destination must never leak to another workspace');
const secondPage=await request('/api/v1/books?limit=1&cursor='+firstPage.data.nextCursor,{cookie:author});
assert.equal(secondPage.status,200);
assert.equal(secondPage.data.books.length,1);
assert.notEqual(secondPage.data.books[0].id,firstPage.data.books[0].id,
  'keyset pagination must not repeat first book');
const scopeMismatch=await request('/api/v1/books?limit=1&type=MEDICINE&cursor='+
  firstPage.data.nextCursor,{cookie:author});
assert.equal(scopeMismatch.status,400,'cursor from different filters must be rejected');
const wrongCursor=await request('/api/v1/books?limit=1&cursor=invalid',{cookie:author});
assert.equal(wrongCursor.status,400);
const invalidTypeFilter=await request('/api/v1/books?type=SECRET',{cookie:author});
assert.equal(invalidTypeFilter.status,400);
const filteredBook=await request('/api/v1/books?limit=5&sort=title&'+
  new URLSearchParams({q:'Ouvrage à archiver',type:'ESSAY',status:'DRAFT'}),{cookie:author});
assert.equal(filteredBook.status,200);
assert.equal(filteredBook.data.total,1);
assert.equal(filteredBook.data.books[0].id,archiveBookId);
const outsiderFilter=await request('/api/v1/books?'+
  new URLSearchParams({q:'Ouvrage à archiver'}),{cookie:outsider});
assert.equal(outsiderFilter.status,200);
assert.equal(outsiderFilter.data.total,0,'cross-tenant title filter stays private');
assert.equal(outsiderFilter.data.books.length,0);
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
// BS-004b: type + language + progression are book metadata only, never text.
const badType=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'properties',bookType:'UNKNOWN',language:'fr',
  expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(badType.status,400,'unknown book types must be rejected');
const badLanguage=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'properties',bookType:'MEDICINE',language:'bad-lang',
  expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(badLanguage.status,400,'book language must be a supported reference locale');
const prematureStatus=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'status',status:'APPROVED',expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(prematureStatus.status,422,'editorial status cannot skip approval workflow');
const outsiderProperties=await request(archivePath,{method:'PATCH',cookie:outsider,body:{
  action:'properties',bookType:'MEDICINE',language:'en',
  expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(outsiderProperties.status,404,'non-member cannot alter book properties');
const csrfProperties=await request(archivePath,{method:'PATCH',cookie:author,omitOrigin:true,body:{
  action:'properties',bookType:'MEDICINE',language:'en',
  expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(csrfProperties.status,403,'properties changes reject cross-site request');
const propertiesSaved=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'properties',bookType:'MEDICINE',language:'en',
  expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(propertiesSaved.status,200,'book properties update accepted');
assert.equal(propertiesSaved.data.book.bookType,'MEDICINE');
assert.equal(propertiesSaved.data.book.language,'en');
assert.equal(propertiesSaved.data.book.status,'DRAFT','metadata does not change workflow');
const staleProperties=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'properties',bookType:'SCIENCE',language:'fr',
  expectedUpdatedAt:renamed.data.book.updatedAt
}});
assert.equal(staleProperties.status,409,'old metadata version rejected');
const writing=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'status',status:'WRITING',expectedUpdatedAt:propertiesSaved.data.book.updatedAt
}});
assert.equal(writing.status,200,'DRAFT to WRITING transition accepted');
assert.equal(writing.data.book.status,'WRITING');
const invalidJump=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'status',status:'PUBLISHED',expectedUpdatedAt:writing.data.book.updatedAt
}});
assert.equal(invalidJump.status,422,'cannot jump directly to published');
const review=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'status',status:'REVIEW',expectedUpdatedAt:writing.data.book.updatedAt
}});
assert.equal(review.status,200,'WRITING to REVIEW transition accepted');
assert.equal(review.data.book.status,'REVIEW');
const afterWorkflow=await request('/api/v1/books',{cookie:author});
const bookWithWorkflow=afterWorkflow.data.books.find(b=>b.id===archiveBookId);
assert.equal(bookWithWorkflow?.status,'REVIEW','library reflects new workflow status');
assert.equal(bookWithWorkflow?.bookType,'MEDICINE','library reflects new book type');
const noOriginArchive=await request(archivePath,{method:'PATCH',cookie:author,omitOrigin:true,body:{
  action:'archive',expectedUpdatedAt:review.data.book.updatedAt
}});
assert.equal(noOriginArchive.status,403,'archive CSRF enforced');
const archived=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'archive',expectedUpdatedAt:review.data.book.updatedAt
}});
assert.equal(archived.status,200,'soft archive accepted');
const archivedStatusAttempt=await request(archivePath,{method:'PATCH',cookie:author,body:{
  action:'status',status:'WRITING',expectedUpdatedAt:archived.data.book.updatedAt
}});
assert.equal(archivedStatusAttempt.status,404,'archived books cannot change workflow');
const liveList=await request('/api/v1/books',{cookie:author});
assert.equal(liveList.status,200);
assert.ok(liveList.data.stats.archived>=1,'archived counter includes the hidden book');
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
// BS-CRUD: deletion is reversible, concurrency-safe, and excluded from active navigation.
const deleteChapterPath=archivePath+'/chapters/'+archiveChapterId;
const staleDelete=await request(deleteChapterPath,{method:'DELETE',cookie:author,body:{
  confirm:'DELETE',expectedUpdatedAt:archiveChapterIndex.updatedAt,expectedRevision:0}});
assert.equal(staleDelete.status,409,'stale metadata cannot delete a chapter');
const outsideDelete=await request(deleteChapterPath,{method:'DELETE',cookie:outsider,body:{
  confirm:'DELETE',expectedUpdatedAt:chapterRenamed.data.chapter.updatedAt,expectedRevision:0}});
assert.equal(outsideDelete.status,404,'outsider cannot delete a chapter');
const csrfDelete=await request(deleteChapterPath,{method:'DELETE',cookie:author,omitOrigin:true,body:{
  confirm:'DELETE',expectedUpdatedAt:chapterRenamed.data.chapter.updatedAt,expectedRevision:0}});
assert.equal(csrfDelete.status,403,'chapter deletion requires origin');
const noConsentDelete=await request(deleteChapterPath,{method:'DELETE',cookie:author,body:{
  expectedUpdatedAt:chapterRenamed.data.chapter.updatedAt,expectedRevision:0}});
assert.equal(noConsentDelete.status,400,'chapter deletion requires explicit confirmation');
const deletedChapter=await request(deleteChapterPath,{method:'DELETE',cookie:author,body:{
  confirm:'DELETE',expectedUpdatedAt:chapterRenamed.data.chapter.updatedAt,expectedRevision:0}});
assert.equal(deletedChapter.status,200,'authorized owner/editor can soft delete');
assert.equal((await request(deleteChapterPath,{cookie:author})).status,404,'soft-deleted chapter hidden');
const afterDeleteList=await request(archivePath+'/chapters',{cookie:author});
assert.equal(afterDeleteList.data.chapters.some(c=>c.id===archiveChapterId),false,'soft-deleted chapter hidden from index');
const sourceTrash=await request(archivePath+'/chapters/trash',{cookie:author});
assert.equal(sourceTrash.status,200);
const trashRow=sourceTrash.data.chapters.find(c=>c.id===archiveChapterId);
assert.ok(trashRow?.updatedAt);
assert.equal((await request(archivePath+'/chapters/trash',{cookie:outsider})).status,404,'trash is private');
const subsequentChapter=await request(archivePath+'/chapters',{method:'POST',cookie:author,body:{title:'Nouveau chapitre après suppression'}});
assert.equal(subsequentChapter.status,201,'positions of deleted chapters must not collide');
const restoreDeleted=await request(deleteChapterPath+'/restore',{method:'POST',cookie:author,body:{
  confirm:'RESTORE_CHAPTER',expectedUpdatedAt:trashRow.updatedAt}});
assert.equal(restoreDeleted.status,200,'restore deleted chapter');
assert.equal((await request(deleteChapterPath,{cookie:author})).status,200,'chapter content retained');
assert.equal((await request(archivePath+'/chapters',{cookie:author})).data.chapters.length,2,'restored chapter plus new chapter');
// BS-004 chapter ordering: only metadata moves, never edit revisions or snapshots.
const orderPath=archivePath+'/chapters/reorder';
const orderBefore=await request(archivePath+'/chapters',{cookie:author});
assert.equal(orderBefore.status,200);
assert.match(orderBefore.data.orderToken,/^[0-9a-f]{64}$/);
const beforeIds=orderBefore.data.chapters.map(c=>c.id);
assert.equal(beforeIds.length,2,'test fixture has two chapters');
const tailId=beforeIds[1],headId=beforeIds[0];
const crossTenantOrder=await request(orderPath,{method:'PATCH',cookie:outsider,body:{
  chapterId:tailId,direction:'up',expectedOrderToken:orderBefore.data.orderToken
}});
assert.equal(crossTenantOrder.status,404,'cross-workspace reorder forbidden');
const noOriginOrder=await request(orderPath,{method:'PATCH',cookie:author,omitOrigin:true,body:{
  chapterId:tailId,direction:'up',expectedOrderToken:orderBefore.data.orderToken
}});
assert.equal(noOriginOrder.status,403,'reorder requires same-origin');
const invalidOrder=await request(orderPath,{method:'PATCH',cookie:author,body:{
  chapterId:tailId,direction:'far',expectedOrderToken:orderBefore.data.orderToken
}});
assert.equal(invalidOrder.status,400,'invalid direction rejected');
const movedUp=await request(orderPath,{method:'PATCH',cookie:author,body:{
  chapterId:tailId,direction:'up',expectedOrderToken:orderBefore.data.orderToken
}});
assert.equal(movedUp.status,200,'author can move a chapter one position');
assert.equal(movedUp.data.changed,true);
assert.notEqual(movedUp.data.orderToken,orderBefore.data.orderToken);
const staleOrder=await request(orderPath,{method:'PATCH',cookie:author,body:{
  chapterId:tailId,direction:'down',expectedOrderToken:orderBefore.data.orderToken
}});
assert.equal(staleOrder.status,409,'stale order token blocks overwritten order');
const afterUp=await request(archivePath+'/chapters',{cookie:author});
assert.deepEqual(afterUp.data.chapters.map(c=>c.id),[tailId,headId],'chapter ordering persisted');
const noMove=await request(orderPath,{method:'PATCH',cookie:author,body:{
  chapterId:tailId,direction:'up',expectedOrderToken:afterUp.data.orderToken
}});
assert.equal(noMove.status,200,'first chapter cannot move above first');
assert.equal(noMove.data.changed,false);
const moveBack=await request(orderPath,{method:'PATCH',cookie:author,body:{
  chapterId:tailId,direction:'down',expectedOrderToken:afterUp.data.orderToken
}});
assert.equal(moveBack.status,200,'return chapter to original order');
const afterBack=await request(archivePath+'/chapters',{cookie:author});
assert.deepEqual(afterBack.data.chapters.map(c=>c.id),beforeIds,'restored original ordering');
assert.deepEqual(afterBack.data.chapters.map(c=>c.revision),
  orderBefore.data.chapters.map(c=>c.revision),'reorder does not create text revisions');
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
const progressAfterSave=await request(progressPath,{cookie:author});
assert.equal(progressAfterSave.status,200);
assert.ok(progressAfterSave.data.progress.writtenChapters>=1,
  'nonblank latest saved revision should count as written');
assert.ok(progressAfterSave.data.progress.revisionRecords>=2,
  'revision records include initial and newly saved revisions');
assert.equal(JSON.stringify(progressAfterSave.data).includes('Premier paragraphe rédigé'),false,
  'book progress API must not expose manuscript prose');
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
const progressWithSnapshot=await request(progressPath,{cookie:author});
assert.equal(progressWithSnapshot.status,200);
assert.ok(progressWithSnapshot.data.progress.snapshots>=1,
  'book progress should include immutable saved snapshots');
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
// Reversible chapter deletion must not damage historical snapshot exports.
const fullChapterList=await request('/api/v1/books/'+bookId+'/chapters',{cookie:author});
const activeChapter=fullChapterList.data.chapters.find(c=>c.id===chapterId);
assert.ok(activeChapter?.updatedAt,'active chapter has optimistic concurrency token');
const removed=await request(path,{method:'DELETE',cookie:author,body:{
  confirm:'DELETE',expectedUpdatedAt:activeChapter.updatedAt,expectedRevision:3
}});
assert.equal(removed.status,200,'soft delete chapter with saved snapshot');
assert.equal((await request(path,{cookie:author})).status,404,'hidden after soft delete');
const hiddenSearch=await request(searchEndpoint+'?q=Premier',{cookie:author});
assert.equal(hiddenSearch.data.hits.some(h=>h.chapterId===chapterId),false,'deleted chapter hidden from active search');
const historicalExport=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=md',{headers:{Cookie:author}});
assert.equal(historicalExport.status,200,'historical snapshot remains exportable after chapter deletion');
const historicalText=await historicalExport.text();
assert.ok(historicalText.includes('Premier paragraphe'),'historical chapter bytes remain intact');
const blockedSnapshotRestore=await request(restorePath,{method:'POST',cookie:author,body:{
  confirm:'RESTORE',expectedRevisions:{[chapterId]:3}
}});
assert.equal(blockedSnapshotRestore.status,409,'cannot silently edit deleted chapter during version restore');
const trashed=(await request('/api/v1/books/'+bookId+'/chapters/trash',{cookie:author})).data.chapters;
const retired=trashed.find(c=>c.id===chapterId);
assert.ok(retired?.updatedAt);
const restoredRetired=await request(path+'/restore',{method:'POST',cookie:author,body:{
  confirm:'RESTORE_CHAPTER',expectedUpdatedAt:retired.updatedAt
}});
assert.equal(restoredRetired.status,200,'previous chapter and revisions restored');
assert.equal((await request(path,{cookie:author})).data.chapter.revision,3,'restored chapter retains revision pointer');
// BS-004f: creating a second edition must never delete the first.
const editionsPath='/api/v1/books/'+bookId+'/editions';
const editionsBefore=await request(editionsPath,{cookie:author});
assert.equal(editionsBefore.status,200,'edition catalogue is accessible to the author');
assert.equal(editionsBefore.data.editions.length,1,'new book starts with one edition');
const firstEditionId=editionsBefore.data.currentEditionId;
assert.equal(editionsBefore.data.editions[0].number,1);
const rejectedEdition=await request(editionsPath,{method:'POST',cookie:outsider,body:{
  confirm:'CREATE_EDITION_FROM_SAVED',expectedEditionId:firstEditionId,
  expectedUpdatedAt:editionsBefore.data.expectedUpdatedAt
}});
assert.equal(rejectedEdition.status,404,'outsider cannot duplicate book edition');
assert.equal((await request(editionsPath,{cookie:outsider})).status,404,
  'outsider cannot list edition history');
const badEditionOrigin=await request(editionsPath,{method:'POST',cookie:author,omitOrigin:true,body:{
  confirm:'CREATE_EDITION_FROM_SAVED',expectedEditionId:firstEditionId,
  expectedUpdatedAt:editionsBefore.data.expectedUpdatedAt
}});
assert.equal(badEditionOrigin.status,403,'new edition creation requires same origin');
const invalidConfirm=await request(editionsPath,{method:'POST',cookie:author,body:{
  confirm:'CREATE',expectedEditionId:firstEditionId,
  expectedUpdatedAt:editionsBefore.data.expectedUpdatedAt
}});
assert.equal(invalidConfirm.status,400,'new edition requires explicit user confirmation');
const duplicated=await request(editionsPath,{method:'POST',cookie:author,body:{
  confirm:'CREATE_EDITION_FROM_SAVED',expectedEditionId:firstEditionId,
  expectedUpdatedAt:editionsBefore.data.expectedUpdatedAt
}});
assert.equal(duplicated.status,201,'second edition created with saved content');
assert.equal(duplicated.data.edition.number,2);
assert.equal(duplicated.data.edition.chapterCount,1);
const staleEdition=await request(editionsPath,{method:'POST',cookie:author,body:{
  confirm:'CREATE_EDITION_FROM_SAVED',expectedEditionId:firstEditionId,
  expectedUpdatedAt:editionsBefore.data.expectedUpdatedAt
}});
assert.equal(staleEdition.status,409,'stale edition creation rejected');
const editionsAfter=await request(editionsPath,{cookie:author});
assert.equal(editionsAfter.status,200);
assert.equal(editionsAfter.data.editions.length,2);
assert.equal(editionsAfter.data.currentEditionId,duplicated.data.edition.id);
assert.equal(editionsAfter.data.editions[0].number,2);
assert.equal(editionsAfter.data.editions[1].number,1);
const oldEditionPath=editionsPath+'/'+firstEditionId;
const historicalEdition=await request(oldEditionPath,{cookie:author});
assert.equal(historicalEdition.status,200,'old edition stays readable');
assert.equal(historicalEdition.data.edition.chapters.length,1);
assert.equal(historicalEdition.data.edition.chapters[0].id,chapterId,
  'original chapter ID is unchanged');
const historicalChapterPath=oldEditionPath+'/chapters/'+chapterId;
const historicalChapter=await request(historicalChapterPath,{cookie:author});
assert.equal(historicalChapter.status,200,'old chapter available read-only');
assert.equal(historicalChapter.data.chapter.revision,3);
assert.ok(historicalChapter.data.chapter.text.includes('Premier paragraphe'),
  'historic text still present after creating new edition');
assert.equal((await request(historicalChapterPath,{cookie:outsider})).status,404,
  'cross-tenant historical text hidden');
assert.equal((await request(historicalChapterPath)).status,401,
  'historical manuscript text requires auth');
const currentEditionChapters=await request('/api/v1/books/'+bookId+'/chapters',{cookie:author});
assert.equal(currentEditionChapters.status,200);
assert.equal(currentEditionChapters.data.chapters.length,1);
const copiedId=currentEditionChapters.data.chapters[0].id;
assert.notEqual(copiedId,chapterId,'copied edition must use NEW chapter IDs');
const copiedChapter=await request('/api/v1/books/'+bookId+'/chapters/'+copiedId,{cookie:author});
assert.equal(copiedChapter.status,200);
assert.equal(copiedChapter.data.chapter.revision,0,
  'copied edition starts its own immutable revision sequence');
assert.deepEqual(copiedChapter.data.chapter.content,doc,
  'new edition starts with exactly the latest saved manuscript');
// BS-008b: compare distinct editions without exposing private prose/hashes.
const comparePath=editionsPath+'/compare?from='+firstEditionId+
  '&to='+duplicated.data.edition.id;
const unchangedEditions=await request(comparePath,{cookie:author});
assert.equal(unchangedEditions.status,200,'comparison of authorized editions');
assert.equal(unchangedEditions.data.comparison.counts.unchanged,1,
  'newly duplicated edition is unchanged despite new chapter IDs');
assert.equal(unchangedEditions.data.comparison.counts.changed,0);
assert.equal(unchangedEditions.data.comparison.counts.added,0);
assert.equal(unchangedEditions.data.comparison.counts.removed,0);
assert.equal(JSON.stringify(unchangedEditions.data).includes('Premier paragraphe'),false,
  'comparison API does not expose any manuscript prose');
assert.equal(JSON.stringify(unchangedEditions.data).includes('contentHash'),false,
  'comparison API does not expose revision hashes');
assert.equal((await request(comparePath,{cookie:outsider})).status,404,
  'cross-workspace edition comparison rejected');
assert.equal((await request(comparePath)).status,401,
  'edition comparison requires active session');
assert.equal((await request(editionsPath+'/compare?from='+firstEditionId+
  '&to='+firstEditionId,{cookie:author})).status,400,
  'cannot compare an edition with itself');
assert.equal((await request(editionsPath+'/compare?from=wrong&to='+
  duplicated.data.edition.id,{cookie:author})).status,400,
  'invalid comparison input rejected');
const secondEditionDoc={type:'doc',content:[{type:'paragraph',content:[
  {type:'text',text:'Texte de la seconde édition modifié et sauvegardé.'}]}]};
const secondEditionSave=await request('/api/v1/books/'+bookId+'/chapters/'+copiedId,{
  method:'PATCH',cookie:author,body:{baseRevision:0,content:secondEditionDoc}
});
assert.equal(secondEditionSave.status,200,'current edition saved independently');
const modifiedEditions=await request(comparePath,{cookie:author});
assert.equal(modifiedEditions.status,200);
assert.equal(modifiedEditions.data.comparison.counts.contentChanged,1,
  'comparison detects changed saved revision by unique chapter title');
assert.equal(modifiedEditions.data.comparison.counts.changed,1);
assert.equal((await request(historicalChapterPath,{cookie:author})).data.chapter.revision,3,
  'changing current edition must not modify historical revisions');
const extraChapter=await request('/api/v1/books/'+bookId+'/chapters',{
  method:'POST',cookie:author,body:{title:'Annexe nouvelle édition'}
});
assert.equal(extraChapter.status,201,'new chapter in the current edition');
const withAddition=await request(comparePath,{cookie:author});
assert.equal(withAddition.status,200);
assert.equal(withAddition.data.comparison.counts.added,1,
  'new chapter is counted as an addition and not a historical modification');
assert.equal(withAddition.data.comparison.counts.removed,0);
assert.equal((await request(path,{cookie:author})).status,404,
  'old edition is not implicitly editable as current edition');
const editionSnapshotExport=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=md',
  {headers:{Cookie:author}});
assert.equal(editionSnapshotExport.status,200,
  'old named snapshot remains exportable after creating new edition');
assert.ok((await editionSnapshotExport.text()).includes('Premier paragraphe'),
  'old snapshot bytes unchanged after new edition');
// BS-008c: restore the OLD snapshot into a completely new current edition.
const forkPath=versionsPath+'/'+snapshotId+'/restore-as-edition';
const beforeFork=await request(editionsPath,{cookie:author});
const forkBody={confirm:'RESTORE_SNAPSHOT_AS_NEW_EDITION',
 expectedEditionId:beforeFork.data.currentEditionId,
 expectedUpdatedAt:beforeFork.data.expectedUpdatedAt};
const snapshotInventory=await request(versionsPath,{cookie:author});
assert.equal(snapshotInventory.data.snapshots.find(s=>s.id===snapshotId).editionNumber,1,
  'snapshot source edition number disclosed without manuscript prose');
assert.equal((await request(forkPath,{method:'POST',body:forkBody})).status,401,
  'fork requires authenticated session');
assert.equal((await request(forkPath,{method:'POST',cookie:outsider,body:forkBody})).status,404,
  'fork cannot cross workspace membership');
assert.equal((await request(forkPath,{method:'POST',cookie:author,omitOrigin:true,
 body:forkBody})).status,403,'snapshot fork requires Origin');
assert.equal((await request(forkPath,{method:'POST',cookie:author,body:{
 ...forkBody,confirm:'RESTORE'}})).status,400,'fork requires explicit mode confirmation');
assert.equal((await request(versionsPath+'/'+randomUUID()+'/restore-as-edition',{
 method:'POST',cookie:author,body:forkBody})).status,404,'unknown snapshot rejected');
assert.equal((await request(forkPath,{method:'POST',cookie:author,body:{
 ...forkBody,expectedEditionId:firstEditionId}})).status,409,
 'fork refuses outdated current edition ID');
const forked=await request(forkPath,{method:'POST',cookie:author,body:forkBody});
assert.equal(forked.status,201,'historical snapshot fork created a new edition');
assert.equal(forked.data.edition.number,3);
assert.equal(forked.data.edition.chapterCount,1,
 'only chapters in named snapshot are restored');
assert.equal(forked.data.sourceSnapshotId,snapshotId);
assert.equal(JSON.stringify(forked.data).includes('Premier paragraphe'),false,
 'fork response never exposes source manuscript prose');
const afterFork=await request(editionsPath,{cookie:author});
assert.equal(afterFork.data.editions.length,3);
assert.equal(afterFork.data.currentEditionId,forked.data.edition.id);
assert.equal(afterFork.data.status,'DRAFT');
const newForkChapters=await request('/api/v1/books/'+bookId+'/chapters',{cookie:author});
assert.equal(newForkChapters.data.chapters.length,1);
const forkChapterId=newForkChapters.data.chapters[0].id;
assert.notEqual(forkChapterId,chapterId,'snapshot chapter gets a distinct ID');
assert.notEqual(forkChapterId,copiedId,'second edition ID is not reused');
const forkedDocument=await request('/api/v1/books/'+bookId+'/chapters/'+forkChapterId,{cookie:author});
assert.equal(forkedDocument.status,200);
assert.equal(forkedDocument.data.chapter.revision,0);
assert.deepEqual(forkedDocument.data.chapter.content,doc,
 'exact old snapshot content restored, NOT newer edition content');
assert.equal((await request('/api/v1/books/'+bookId+'/chapters/'+copiedId,{cookie:author})).status,404,
 'old editor tab cannot access historical chapter as current');
const secondEditionHistory=await request(editionsPath+'/'+duplicated.data.edition.id+
 '/chapters/'+copiedId,{cookie:author});
assert.equal(secondEditionHistory.status,200);
assert.ok(secondEditionHistory.data.chapter.text.includes('seconde édition'),
 'second edition content preserved after snapshot fork');
const retryFork=await request(forkPath,{method:'POST',cookie:author,body:forkBody});
assert.equal(retryFork.status,409,'repeated submission cannot duplicate a new edition');
const afterRetry=await request(editionsPath,{cookie:author});
assert.equal(afterRetry.data.editions.length,3,'stale retry produced no side effects');
const snapshotRecheck=await fetch(base+versionsPath+'/'+snapshotId+'/export?format=md',
 {headers:{Cookie:author}});
assert.equal(snapshotRecheck.status,200);
assert.ok((await snapshotRecheck.text()).includes('Premier paragraphe'),
 'fork leaves historical snapshot byte content/export intact');

// BS-004i: merge two saved ProseMirror chapters into an independent NEW
// chapter, preserving every original revision/comment/snapshot and order.
const mergeBook=await request('/api/v1/books',{method:'POST',cookie:author,
 body:{title:'Mémoire pour fusion non destructive',bookType:'SCIENCE',language:'fr'}});
assert.equal(mergeBook.status,201);
const mergeBookId=mergeBook.data.book.id;
const mergeFirstId=mergeBook.data.book.chapterId;
const mergeFirstPath='/api/v1/books/'+mergeBookId+'/chapters/'+mergeFirstId;
const mergeSecondCreate=await request('/api/v1/books/'+mergeBookId+'/chapters',{
 method:'POST',cookie:author,body:{title:'Chapitre original deuxième'}});
assert.equal(mergeSecondCreate.status,201);
const mergeSecondId=mergeSecondCreate.data.chapter.id;
const mergeSecondPath='/api/v1/books/'+mergeBookId+'/chapters/'+mergeSecondId;
const mergeFirstDoc={type:'doc',content:[
 {type:'heading',attrs:{level:2},content:[{type:'text',text:'Chapitre introductif'}]},
 {type:'paragraph',content:[{type:'text',text:'Règle éditoriale '},
   {type:'text',text:'importante',marks:[{type:'bold'}]}]}
]};
const mergeSecondDoc={type:'doc',content:[
 {type:'paragraph',content:[{type:'text',text:'Approche complémentaire été 2026.'}]},
 {type:'paragraph',content:[{type:'text',text:'Référence sûre',marks:[{
   type:'link',attrs:{href:'https://example.org/medicine'}}]}]}
]};
assert.equal((await request(mergeFirstPath,{method:'PATCH',cookie:author,
 body:{baseRevision:0,content:mergeFirstDoc}})).status,200);
assert.equal((await request(mergeSecondPath,{method:'PATCH',cookie:author,
 body:{baseRevision:0,content:mergeSecondDoc}})).status,200);
const mergeComment=await request(mergeFirstPath+'/comments',{method:'POST',
 cookie:author,body:{baseRevision:1,body:'Note conservée sur la source.'}});
assert.equal(mergeComment.status,201);
const mergeSnap=await request('/api/v1/books/'+mergeBookId+'/snapshots',{
 method:'POST',cookie:author,body:{name:'Deux sources avant fusion'}});
assert.equal(mergeSnap.status,201);
const mergeEditionBefore=await request('/api/v1/books/'+mergeBookId+'/editions',
 {cookie:author});
assert.equal(mergeEditionBefore.status,200);
const mergeWriting=await request('/api/v1/books/'+mergeBookId,{
 method:'PATCH',cookie:author,body:{action:'status',status:'WRITING',
 expectedUpdatedAt:mergeEditionBefore.data.expectedUpdatedAt}});
assert.equal(mergeWriting.status,200,'set source book to WRITING before merge');
const mergeChaptersBefore=await request('/api/v1/books/'+mergeBookId+'/chapters',
 {cookie:author});
assert.equal(mergeChaptersBefore.status,200);
const mergeOne=mergeChaptersBefore.data.chapters.find(c=>c.id===mergeFirstId);
const mergeTwo=mergeChaptersBefore.data.chapters.find(c=>c.id===mergeSecondId);
assert.equal(mergeOne.revision,1);
assert.equal(mergeTwo.revision,1);
const mergePath=mergeFirstPath+'/merge';
const mergeOp=randomUUID();
const mergeBody={
 confirm:'MERGE_SAVED_CHAPTERS_AS_NEW',
 secondChapterId:mergeSecondId,title:'Fusion proposée et indépendante',
 operationId:mergeOp,expectedEditionId:mergeEditionBefore.data.currentEditionId,
 expectedFirstRevision:mergeOne.revision,
 expectedFirstUpdatedAt:mergeOne.updatedAt,
 expectedSecondRevision:mergeTwo.revision,
 expectedSecondUpdatedAt:mergeTwo.updatedAt
};
assert.equal((await request(mergePath,{method:'POST',body:mergeBody})).status,401);
assert.equal((await request(mergePath,{method:'POST',cookie:outsider,
 body:mergeBody})).status,404);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 omitOrigin:true,body:mergeBody})).status,403);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,confirm:'UNSAFE'}})).status,400);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,secondChapterId:mergeFirstId}})).status,400);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,operationId:'not-uuid'}})).status,400);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,secondChapterId:randomUUID()}})).status,404);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,expectedFirstRevision:0}})).status,409);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,expectedSecondUpdatedAt:'2020-01-01T00:00:00.000Z'}})).status,409);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,expectedEditionId:randomUUID()}})).status,409);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,title:'A'.repeat(5000)}})).status,413);
const merged=await request(mergePath,{method:'POST',cookie:author,body:mergeBody});
assert.equal(merged.status,201,'merge creates one new independent chapter');
assert.equal(merged.data.replayed,false);
assert.equal(merged.data.bookId,mergeBookId);
const mergedId=merged.data.chapter.id;
assert.notEqual(mergedId,mergeFirstId);
assert.notEqual(mergedId,mergeSecondId);
assert.equal(merged.data.chapter.revision,0);
const sameMerge=await request(mergePath,{method:'POST',cookie:author,body:mergeBody});
assert.equal(sameMerge.status,200,'retry has no second new chapter');
assert.equal(sameMerge.data.replayed,true);
assert.equal(sameMerge.data.chapter.id,mergedId);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:{...mergeBody,title:'Different title but same operation ID'}})).status,409,
 'reusing an operation UUID for another instruction is rejected');
const mergeChaptersAfter=await request('/api/v1/books/'+mergeBookId+'/chapters',
 {cookie:author});
assert.equal(mergeChaptersAfter.data.chapters.length,3);
assert.deepEqual(mergeChaptersAfter.data.chapters.map(c=>c.id),
 [mergeFirstId,mergeSecondId,mergedId],'append only; both sources keep their positions');
const mergedRead=await request('/api/v1/books/'+mergeBookId+'/chapters/'+mergedId,
 {cookie:author});
assert.equal(mergedRead.status,200);
assert.deepEqual(mergedRead.data.chapter.content,{type:'doc',content:[
 ...mergeFirstDoc.content,...mergeSecondDoc.content]},
 'rich-text blocks joined exactly in selected order without dropping marks');
assert.equal(mergedRead.data.chapter.revision,0);
const sourceFirstAfter=await request(mergeFirstPath,{cookie:author});
const sourceSecondAfter=await request(mergeSecondPath,{cookie:author});
assert.deepEqual(sourceFirstAfter.data.chapter.content,mergeFirstDoc);
assert.deepEqual(sourceSecondAfter.data.chapter.content,mergeSecondDoc);
assert.equal(sourceFirstAfter.data.chapter.revision,1);
assert.equal(sourceSecondAfter.data.chapter.revision,1);
const mergedComments=await request('/api/v1/books/'+mergeBookId+'/chapters/'+
 mergedId+'/comments',{cookie:author});
assert.equal(mergedComments.status,200);
assert.deepEqual(mergedComments.data.comments,[],
 'old comments and anchors not inherited by merged copy');
const mergedRevisions=await request('/api/v1/books/'+mergeBookId+'/chapters/'+
 mergedId+'/revisions',{cookie:author});
assert.equal(mergedRevisions.status,200);
assert.deepEqual(mergedRevisions.data.revisions.map(c=>c.sequence),[0],
 'new chapter has one initial revision');
const mergedSnapshotAfter=await request('/api/v1/books/'+mergeBookId+'/snapshots',
 {cookie:author});
assert.equal(mergedSnapshotAfter.data.snapshots.length,1);
assert.equal(mergedSnapshotAfter.data.snapshots[0].id,mergeSnap.data.snapshot.id,
 'snapshot manifest remains intact');
const mergeEditionAfter=await request('/api/v1/books/'+mergeBookId+'/editions',
 {cookie:author});
assert.equal(mergeEditionAfter.data.status,'DRAFT',
 'new editorial merged copy invalidates WRITING status');
assert.equal((await request('/api/v1/books/'+mergeBookId+
 '/chapters/'+mergedId,{cookie:outsider})).status,404);
const mergedNextEdition=await request('/api/v1/books/'+mergeBookId+'/editions',{
 method:'POST',cookie:author,body:{
 confirm:'CREATE_EDITION_FROM_SAVED',
 expectedEditionId:mergeEditionAfter.data.currentEditionId,
 expectedUpdatedAt:mergeEditionAfter.data.expectedUpdatedAt
 }});
assert.equal(mergedNextEdition.status,201);
assert.equal((await request(mergePath,{method:'POST',cookie:author,
 body:mergeBody})).status,404,'old edition chapters cannot be merged into current');

// BS-004h: copy exact saved text across TWO different books of SAME workspace.
// Access to source or destination in a different workspace must fail closed.
const crossSource=await request('/api/v1/books',{method:'POST',cookie:author,
 body:{title:'Source entre deux livres',bookType:'SCIENCE',language:'fr'}});
const crossTarget=await request('/api/v1/books',{method:'POST',cookie:author,
 body:{title:'Destination pour un chapitre',bookType:'MEDICINE',language:'en'}});
const outsiderTarget=await request('/api/v1/books',{method:'POST',cookie:outsider,
 body:{title:'Destination autre espace privée',bookType:'SCIENCE',language:'fr'}});
assert.equal(crossSource.status,201);
assert.equal(crossTarget.status,201);
assert.equal(outsiderTarget.status,201);
const fromBook=crossSource.data.book.id,toBook=crossTarget.data.book.id;
const fromChapter=crossSource.data.book.chapterId,toOriginalChapter=crossTarget.data.book.chapterId;
const fromPath='/api/v1/books/'+fromBook+'/chapters/'+fromChapter;
const transferDoc={type:'doc',content:[{type:'paragraph',content:[
 {type:'text',text:'Texte scientifique transférable sans perte, été 2026.'}]}]};
assert.equal((await request(fromPath,{method:'PATCH',cookie:author,
 body:{baseRevision:0,content:transferDoc}})).status,200);
const crossComment=await request(fromPath+'/comments',{method:'POST',cookie:author,
 body:{baseRevision:1,body:'Commentaire privé du chapitre d’origine.'}});
const crossSnapshot=await request('/api/v1/books/'+fromBook+'/snapshots',{
 method:'POST',cookie:author,body:{name:'Snapshot original non transférable'}});
assert.equal(crossComment.status,201);
assert.equal(crossSnapshot.status,201);
const targetsPath='/api/v1/books/'+fromBook+'/chapter-copy-targets';
const targets=await request(targetsPath,{cookie:author});
assert.equal(targets.status,200);
assert.ok(targets.data.targets.some(x=>x.id===toBook),
 'same-workspace editable destination appears');
assert.equal(targets.data.targets.some(x=>x.id===fromBook),false,
 'source is not offered as its own destination');
assert.equal(targets.data.targets.some(x=>x.id===outsiderTarget.data.book.id),
 false,'no target in unrelated workspace exposed');
assert.equal((await request(targetsPath)).status,401);
assert.equal((await request(targetsPath,{cookie:outsider})).status,404);
assert.equal((await request(targetsPath+'?search=Destination%20pour',{cookie:author}))
 .data.targets.some(x=>x.id===toBook),true,'search by title finds destination');
assert.equal((await request(targetsPath+'?search=Destination%20autre',{cookie:author}))
 .data.targets.length,0,'search never reveals outsider title');
assert.equal((await request(targetsPath+'?search=x&search=y',{cookie:author}))
 .status,400,'repeated query param rejected');
const fromEdition=await request('/api/v1/books/'+fromBook+'/editions',{cookie:author});
const toEdition=await request('/api/v1/books/'+toBook+'/editions',{cookie:author});
const fromList=await request('/api/v1/books/'+fromBook+'/chapters',{cookie:author});
assert.equal(fromEdition.status,200);
assert.equal(toEdition.status,200);
assert.equal(fromList.status,200);
const fromRow=fromList.data.chapters.find(x=>x.id===fromChapter);
assert.equal(fromRow.revision,1);
const transferPath=fromPath+'/copy-to-book';
const op=randomUUID();
const transferBody={
 confirm:'COPY_CHAPTER_TO_BOOK_SAVED_ONLY',operationId:op,
 title:'Méthodologie reprise indépendamment',destinationBookId:toBook,
 expectedSourceEditionId:fromEdition.data.currentEditionId,
 expectedDestinationEditionId:toEdition.data.currentEditionId,
 expectedDestinationUpdatedAt:toEdition.data.expectedUpdatedAt,
 expectedRevision:fromRow.revision,expectedChapterUpdatedAt:fromRow.updatedAt
};
assert.equal((await request(transferPath,{method:'POST',body:transferBody})).status,401);
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 omitOrigin:true,body:transferBody})).status,403);
assert.equal((await request(transferPath,{method:'POST',cookie:outsider,
 body:transferBody})).status,404);
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:{...transferBody,destinationBookId:outsiderTarget.data.book.id}})).status,404,
 'cross-workspace destination rejected before writing');
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:{...transferBody,destinationBookId:fromBook}})).status,400,
 'same-book transfer refused (use chapter duplicate instead)');
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:{...transferBody,confirm:'UNSAFE'}})).status,400);
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:{...transferBody,operationId:'wrong'}})).status,400);
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:{...transferBody,expectedRevision:0}})).status,409);
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:{...transferBody,expectedDestinationEditionId:randomUUID()}})).status,409);
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:{...transferBody,expectedDestinationUpdatedAt:'2020-01-01T00:00:00.000Z'}}))
 .status,409);
const moved=await request(transferPath,{method:'POST',cookie:author,body:transferBody});
assert.equal(moved.status,201,'saved cross-book copy creates new chapter');
assert.equal(moved.data.destinationBookId,toBook);
assert.equal(moved.data.replayed,false);
const copiedInto=moved.data.chapter.id;
assert.notEqual(copiedInto,fromChapter);
assert.notEqual(copiedInto,toOriginalChapter);
assert.equal(moved.data.chapter.revision,0);
const sameTransfer=await request(transferPath,{method:'POST',cookie:author,
 body:transferBody});
assert.equal(sameTransfer.status,200,'retry exact operation is idempotent');
assert.equal(sameTransfer.data.replayed,true);
assert.equal(sameTransfer.data.chapter.id,copiedInto);
const toList=await request('/api/v1/books/'+toBook+'/chapters',{cookie:author});
assert.equal(toList.data.chapters.length,2);
assert.equal(toList.data.chapters[0].id,toOriginalChapter);
assert.equal(toList.data.chapters[1].id,copiedInto,
 'new chapter appended without moving existing destination chapters');
const newCrossText=await request('/api/v1/books/'+toBook+'/chapters/'+copiedInto,
 {cookie:author});
assert.equal(newCrossText.status,200);
assert.deepEqual(newCrossText.data.chapter.content,transferDoc);
assert.equal(newCrossText.data.chapter.revision,0);
assert.deepEqual((await request(fromPath,{cookie:author})).data.chapter.content,
 transferDoc,'source chapter content untouched');
const crossCopyComments=await request('/api/v1/books/'+toBook+
 '/chapters/'+copiedInto+'/comments',{cookie:author});
assert.deepEqual(crossCopyComments.data.comments,[],'source comments are not copied');
const crossCopyRevisions=await request('/api/v1/books/'+toBook+
 '/chapters/'+copiedInto+'/revisions',{cookie:author});
assert.deepEqual(crossCopyRevisions.data.revisions.map(x=>x.sequence),[0]);
const targetSnapshotsAfter=await request('/api/v1/books/'+toBook+'/snapshots',
 {cookie:author});
assert.equal(targetSnapshotsAfter.data.snapshots.length,0);
const sourceSnapshotsAfter=await request('/api/v1/books/'+fromBook+'/snapshots',
 {cookie:author});
assert.equal(sourceSnapshotsAfter.data.snapshots.some(x=>x.id===crossSnapshot.data.snapshot.id),true);
const destinationAfter=await request('/api/v1/books/'+toBook+'/editions',
 {cookie:author});
assert.equal(destinationAfter.data.status,'DRAFT',
 'target returns to editorial draft after copying a chapter');
assert.equal((await request('/api/v1/books/'+toBook+'/chapters/'+copiedInto,
 {cookie:outsider})).status,404);
const nextFrom=await request('/api/v1/books/'+fromBook+'/editions',
 {method:'POST',cookie:author,body:{
 confirm:'CREATE_EDITION_FROM_SAVED',
 expectedEditionId:fromEdition.data.currentEditionId,
 expectedUpdatedAt:fromEdition.data.expectedUpdatedAt}});
assert.equal(nextFrom.status,201);
assert.equal((await request(transferPath,{method:'POST',cookie:author,
 body:transferBody})).status,404,
 'historical-edition source chapter cannot be copied');

// BS-004g: duplicate a saved chapter into a NEW independent chapter at the
// end of its CURRENT edition. Never copy comments, provenance or snapshots.
const chapterDupBook=await request('/api/v1/books',{method:'POST',cookie:author,
 body:{title:'Livre source pour copie de chapitre',bookType:'SCIENCE',language:'fr'}});
assert.equal(chapterDupBook.status,201);
const chapterDupBookId=chapterDupBook.data.book.id;
const chapterDupSourceId=chapterDupBook.data.book.chapterId;
const chapterDupSrc='/api/v1/books/'+chapterDupBookId+'/chapters/'+chapterDupSourceId;
const firstCopyDoc={type:'doc',content:[{type:'paragraph',content:[
 {type:'text',text:'Première rédaction du chapitre source.'}]}]};
const latestCopyDoc={type:'doc',content:[{type:'paragraph',content:[
 {type:'text',text:'Version finale enregistrée pour copie, avec son texte entier.'}]}]};
assert.equal((await request(chapterDupSrc,{method:'PATCH',cookie:author,
 body:{baseRevision:0,content:firstCopyDoc}})).status,200);
assert.equal((await request(chapterDupSrc,{method:'PATCH',cookie:author,
 body:{baseRevision:1,content:latestCopyDoc}})).status,200);
const anchoredCopyComment=await request(chapterDupSrc+'/comments',{
 method:'POST',cookie:author,body:{baseRevision:2,body:'Commentaire source non copié.'}});
assert.equal(anchoredCopyComment.status,201);
const chapterDupSnap=await request('/api/v1/books/'+chapterDupBookId+'/snapshots',{
 method:'POST',cookie:author,body:{name:'Snapshot du chapitre original'}});
assert.equal(chapterDupSnap.status,201);
const sourceChaptersBeforeCopy=await request('/api/v1/books/'+chapterDupBookId+'/chapters',
 {cookie:author});
assert.equal(sourceChaptersBeforeCopy.status,200);
const sourceCopyChapter=sourceChaptersBeforeCopy.data.chapters.find(c=>c.id===chapterDupSourceId);
assert.equal(sourceCopyChapter.revision,2);
const chapterDupEdition=await request('/api/v1/books/'+chapterDupBookId+'/editions',
 {cookie:author});
assert.equal(chapterDupEdition.status,200);
const chapterDupApi=chapterDupSrc+'/duplicate';
const chapterDupOp=randomUUID();
const copyChapterBody={confirm:'DUPLICATE_CHAPTER_FROM_SAVED',
 title:'Copie indépendante du premier chapitre',operationId:chapterDupOp,
 expectedEditionId:chapterDupEdition.data.currentEditionId,
 expectedRevision:2,expectedChapterUpdatedAt:sourceCopyChapter.updatedAt};
assert.equal((await request(chapterDupApi,{method:'POST',body:copyChapterBody})).status,401);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:outsider,
 body:copyChapterBody})).status,404);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:author,
 omitOrigin:true,body:copyChapterBody})).status,403);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:author,
 body:{...copyChapterBody,confirm:'DUPLICATE_UNSAFE'}})).status,400);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:author,
 body:{...copyChapterBody,operationId:'malformed'}})).status,400);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:author,
 body:{...copyChapterBody,expectedRevision:1}})).status,409);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:author,
 body:{...copyChapterBody,expectedEditionId:randomUUID()}})).status,409);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:author,
 body:{...copyChapterBody,expectedChapterUpdatedAt:'2020-01-01T00:00:00.000Z'}})).status,409);
const chapterCopied=await request(chapterDupApi,{method:'POST',cookie:author,
 body:copyChapterBody});
assert.equal(chapterCopied.status,201,'chapter copied independently from saved data');
assert.equal(chapterCopied.data.replayed,false);
const newCopyChapterId=chapterCopied.data.chapter.id;
assert.notEqual(newCopyChapterId,chapterDupSourceId);
assert.equal(chapterCopied.data.chapter.revision,0);
const chapterCopyRetry=await request(chapterDupApi,{method:'POST',cookie:author,
 body:copyChapterBody});
assert.equal(chapterCopyRetry.status,200);
assert.equal(chapterCopyRetry.data.replayed,true);
assert.equal(chapterCopyRetry.data.chapter.id,newCopyChapterId,
 'retry operationId returns the identical chapter, no duplicates');
const copyChapterRows=await request('/api/v1/books/'+chapterDupBookId+'/chapters',
 {cookie:author});
assert.equal(copyChapterRows.data.chapters.length,2);
assert.deepEqual(copyChapterRows.data.chapters.map(c=>c.id),
 [chapterDupSourceId,newCopyChapterId],'new chapter appended after source');
assert.equal(copyChapterRows.data.chapters[1].title,'Copie indépendante du premier chapitre');
assert.equal(copyChapterRows.data.chapters[1].revision,0);
const duplicatedText=await request('/api/v1/books/'+chapterDupBookId+
 '/chapters/'+newCopyChapterId,{cookie:author});
assert.equal(duplicatedText.status,200);
assert.deepEqual(duplicatedText.data.chapter.content,latestCopyDoc,
 'copy uses latest saved revision, not earlier revision');
const originalAfterCopy=await request(chapterDupSrc,{cookie:author});
assert.equal(originalAfterCopy.status,200);
assert.deepEqual(originalAfterCopy.data.chapter.content,latestCopyDoc);
assert.equal(originalAfterCopy.data.chapter.revision,2,'original revision untouched');
const newCopyComments=await request('/api/v1/books/'+chapterDupBookId+
 '/chapters/'+newCopyChapterId+'/comments',{cookie:author});
assert.equal(newCopyComments.status,200);
assert.deepEqual(newCopyComments.data.comments,[],
 'comments and anchors never inherited on copied chapter');
const newCopyRevisions=await request('/api/v1/books/'+chapterDupBookId+
 '/chapters/'+newCopyChapterId+'/revisions',{cookie:author});
assert.equal(newCopyRevisions.status,200);
assert.deepEqual(newCopyRevisions.data.revisions.map(r=>r.sequence),[0],
 'copied chapter starts with a single new sequence zero');
const chapterSnapAfterCopy=await request('/api/v1/books/'+chapterDupBookId+
 '/snapshots',{cookie:author});
assert.equal(chapterSnapAfterCopy.data.snapshots.length,1);
assert.equal(chapterSnapAfterCopy.data.snapshots[0].id,chapterDupSnap.data.snapshot.id,
 'source snapshot unaffected; no snapshot is automatically created');
const editionAfterChapterCopy=await request('/api/v1/books/'+chapterDupBookId+
 '/editions',{cookie:author});
assert.equal(editionAfterChapterCopy.data.status,'DRAFT',
 'new editorial chapter invalidates prior status');
assert.equal((await request('/api/v1/books/'+chapterDupBookId+
 '/chapters/'+newCopyChapterId,{cookie:outsider})).status,404);
const invalidChapterCopy=await request('/api/v1/books/'+chapterDupBookId+
 '/chapters/'+randomUUID()+'/duplicate',{method:'POST',cookie:author,
 body:copyChapterBody});
assert.equal(invalidChapterCopy.status,404);
const newEditionAfterCopy=await request('/api/v1/books/'+chapterDupBookId+'/editions',
 {method:'POST',cookie:author,body:{confirm:'CREATE_EDITION_FROM_SAVED',
 expectedEditionId:editionAfterChapterCopy.data.currentEditionId,
 expectedUpdatedAt:editionAfterChapterCopy.data.expectedUpdatedAt}});
assert.equal(newEditionAfterCopy.status,201);
assert.equal((await request(chapterDupApi,{method:'POST',cookie:author,
 body:copyChapterBody})).status,404,
 'old edition chapter cannot create or replay copy into current edition');

// BS-004f: a book copy is an independent draft with only the latest saved
// chapters of the current edition, never the source/comments/snapshots/scans.
const dupSource=await request('/api/v1/books',{method:'POST',cookie:author,
 body:{title:'Ouvrage scientifique à dupliquer',bookType:'SCIENCE',language:'fr'}});
assert.equal(dupSource.status,201);
const dupBookId=dupSource.data.book.id,dupChapter1=dupSource.data.book.chapterId;
const dupFirstPath='/api/v1/books/'+dupBookId+'/chapters/'+dupChapter1;
const dupText1='Texte original soigneusement sauvegardé.';
const dupDoc1={type:'doc',content:[{type:'paragraph',content:[
 {type:'text',text:dupText1}]}]};
assert.equal((await request(dupFirstPath,{method:'PATCH',cookie:author,
 body:{baseRevision:0,content:dupDoc1}})).status,200);
const dupAdd=await request('/api/v1/books/'+dupBookId+'/chapters',{
 method:'POST',cookie:author,body:{title:'Bibliographie détaillée'}});
assert.equal(dupAdd.status,201);
const dupChapter2=dupAdd.data.chapter.id;
const dupDoc2={type:'doc',content:[{type:'paragraph',content:[
 {type:'text',text:'Deuxième chapitre de la copie du livre, sans perte.'}]}]};
assert.equal((await request('/api/v1/books/'+dupBookId+'/chapters/'+dupChapter2,{
 method:'PATCH',cookie:author,body:{baseRevision:0,content:dupDoc2}})).status,200);
const dupComment=await request(dupFirstPath+'/comments',{method:'POST',cookie:author,
 body:{baseRevision:1,body:'Commentaire réservé au livre initial.'}});
assert.equal(dupComment.status,201);
const dupSnapshot=await request('/api/v1/books/'+dupBookId+'/snapshots',
 {method:'POST',cookie:author,body:{name:'Version privée originale'}});
assert.equal(dupSnapshot.status,201);
const duplicateMetadata=await request('/api/v1/books/'+dupBookId+'/editions',{cookie:author});
assert.equal(duplicateMetadata.status,200);
const dupPath='/api/v1/books/'+dupBookId+'/duplicate';
const dupOperation=randomUUID();
const dupBody={confirm:'DUPLICATE_BOOK_FROM_SAVED_EDITION',
 title:'Copie scientifique indépendante E2E',operationId:dupOperation,
 expectedEditionId:duplicateMetadata.data.currentEditionId,
 expectedUpdatedAt:duplicateMetadata.data.expectedUpdatedAt};
assert.equal((await request(dupPath,{method:'POST',body:dupBody})).status,401);
assert.equal((await request(dupPath,{method:'POST',cookie:outsider,body:dupBody})).status,404);
assert.equal((await request(dupPath,{method:'POST',cookie:author,body:dupBody,
 omitOrigin:true})).status,403);
assert.equal((await request(dupPath,{method:'POST',cookie:author,body:{...dupBody,
 confirm:'DUPLICATE_UNSAFE'}})).status,400);
assert.equal((await request(dupPath,{method:'POST',cookie:author,body:{...dupBody,
 operationId:'not-a-uuid'}})).status,400);
assert.equal((await request(dupPath,{method:'POST',cookie:author,body:{...dupBody,
 expectedEditionId:randomUUID()}})).status,409);
assert.equal((await request(dupPath,{method:'POST',cookie:author,body:{...dupBody,
 expectedUpdatedAt:'2020-01-01T00:00:00.000Z'}})).status,409);
const dupe=await request(dupPath,{method:'POST',cookie:author,body:dupBody});
assert.equal(dupe.status,201,'create entirely independent duplicate book');
assert.ok(dupe.data.book.id!==dupBookId);
assert.equal(dupe.data.book.chapterCount,2);
assert.equal(dupe.data.replayed,false);
const copyId=dupe.data.book.id;
const idempotent=await request(dupPath,{method:'POST',cookie:author,body:dupBody});
assert.equal(idempotent.status,200,'same requestId retries without duplication');
assert.equal(idempotent.data.book.id,copyId);
assert.equal(idempotent.data.replayed,true);
const dupBooks=await request('/api/v1/books?limit=100',{cookie:author});
assert.equal(dupBooks.status,200);
const copySummary=dupBooks.data.books.find(item=>item.id===copyId);
assert.equal(copySummary.title,'Copie scientifique indépendante E2E');
assert.equal(copySummary.status,'DRAFT');
assert.equal(copySummary.bookType,'SCIENCE');
assert.equal(copySummary.language,'fr');
assert.equal(dupBooks.data.books.filter(b=>b.id===copyId).length,1);
const dupNewEditions=await request('/api/v1/books/'+copyId+'/editions',{cookie:author});
assert.equal(dupNewEditions.status,200);
assert.equal(dupNewEditions.data.editions.length,1);
assert.equal(dupNewEditions.data.editions[0].number,1);
assert.notEqual(dupNewEditions.data.currentEditionId,
 duplicateMetadata.data.currentEditionId,'different edition identifier');
const dupOriginalChapters=await request('/api/v1/books/'+dupBookId+'/chapters',{cookie:author});
const copiedChapters=await request('/api/v1/books/'+copyId+'/chapters',{cookie:author});
assert.equal(dupOriginalChapters.status,200);
assert.equal(copiedChapters.status,200);
assert.equal(copiedChapters.data.chapters.length,2);
assert.deepEqual(copiedChapters.data.chapters.map(c=>c.title),
 dupOriginalChapters.data.chapters.map(c=>c.title));
assert.deepEqual(copiedChapters.data.chapters.map(c=>c.position),
 dupOriginalChapters.data.chapters.map(c=>c.position));
for(let i=0;i<2;i++){
 const originalChapter=dupOriginalChapters.data.chapters[i];
 const clonedChapter=copiedChapters.data.chapters[i];
 assert.notEqual(clonedChapter.id,originalChapter.id);
 assert.equal(clonedChapter.revision,0,'copied chapter starts at revision zero');
 const from=await request('/api/v1/books/'+dupBookId+'/chapters/'+originalChapter.id,
  {cookie:author});
 const to=await request('/api/v1/books/'+copyId+'/chapters/'+clonedChapter.id,
  {cookie:author});
 assert.equal(from.status,200);assert.equal(to.status,200);
 assert.deepEqual(to.data.chapter.content,from.data.chapter.content);
 assert.equal(to.data.chapter.revision,0);
}
const dupNoComments=await request('/api/v1/books/'+copyId+'/chapters/'+
 copiedChapters.data.chapters[0].id+'/comments',{cookie:author});
assert.equal(dupNoComments.status,200);
assert.deepEqual(dupNoComments.data.comments,[],
 'editorial comments stay attached only to the source book');
const dupNoSnapshots=await request('/api/v1/books/'+copyId+'/snapshots',{cookie:author});
assert.equal(dupNoSnapshots.status,200);
assert.deepEqual(dupNoSnapshots.data.snapshots,[],
 'named snapshots are never inherited by a new book');
const dupNoFiles=await request('/api/v1/books/'+copyId+'/files',{cookie:author});
assert.ok([200,503].includes(dupNoFiles.status),
 'file listing may be unavailable in CI without configured Supabase Storage');
if(dupNoFiles.status===200)
 assert.deepEqual(dupNoFiles.data.files,[],
  'new book has no inherited source object or scan attestation');
else assert.ok(['STORAGE_NOT_CONFIGURED','STORAGE_UNAVAILABLE'].includes(dupNoFiles.data.error),
 'storage unavailable cannot be used as evidence of empty Supabase storage');
const preservedSnapshot=await request('/api/v1/books/'+dupBookId+'/snapshots',{cookie:author});
assert.ok(preservedSnapshot.data.snapshots.some(s=>s.id===dupSnapshot.data.snapshot.id),
 'original immutable named snapshot unchanged');
assert.equal((await request('/api/v1/books/'+copyId+'/editions',{cookie:outsider})).status,404,
 'new duplicate is also private to original workspace');
const origAfterDup=await request('/api/v1/books/'+dupBookId+'/editions',{cookie:author});
assert.equal(origAfterDup.data.currentEditionId,
 duplicateMetadata.data.currentEditionId,'original edition remains unchanged');

// BS-008d: historical chapter revisions remain readable and restorable
// without replacing prior rows or allowing stale editor tabs.
const historyBook=await request('/api/v1/books',{method:'POST',cookie:author,
 body:{title:'Historique des révisions E2E',bookType:'ESSAY',language:'fr'}});
assert.equal(historyBook.status,201);
const historyBookId=historyBook.data.book.id;
const historyChapterId=historyBook.data.book.chapterId;
const historyChapterPath='/api/v1/books/'+historyBookId+'/chapters/'+historyChapterId;
const historyPath=historyChapterPath+'/revisions';
const firstDoc={type:'doc',content:[{type:'paragraph',content:[
 {type:'text',text:'Première rédaction à préserver dans l’historique.'}]}]};
const revisedDoc={type:'doc',content:[{type:'paragraph',content:[
 {type:'text',text:'Deuxième rédaction indépendante et sauvegardée.'}]}]};
const firstHistorySave=await request(historyChapterPath,{method:'PATCH',cookie:author,
 body:{baseRevision:0,content:firstDoc}});
assert.equal(firstHistorySave.status,200);
assert.equal(firstHistorySave.data.revision,1);
const secondHistorySave=await request(historyChapterPath,{method:'PATCH',cookie:author,
 body:{baseRevision:1,content:revisedDoc}});
assert.equal(secondHistorySave.status,200);
assert.equal(secondHistorySave.data.revision,2);
const firstHistoryPage=await request(historyPath+'?limit=2',{cookie:author});
assert.equal(firstHistoryPage.status,200);
assert.deepEqual(firstHistoryPage.data.revisions.map(r=>r.sequence),[2,1]);
assert.equal(firstHistoryPage.data.nextBefore,1);
assert.equal(firstHistoryPage.data.currentRevision,2);
assert.ok(firstHistoryPage.data.revisions[0].authorName);
assert.equal(JSON.stringify(firstHistoryPage.data).includes('Première rédaction'),false,
 'history inventory never returns prose');
const remainingHistory=await request(historyPath+'?limit=2&before=1',{cookie:author});
assert.deepEqual(remainingHistory.data.revisions.map(r=>r.sequence),[0]);
assert.equal(remainingHistory.data.nextBefore,null);
assert.equal((await request(historyPath+'?limit=100',{cookie:author})).status,400);
assert.equal((await request(historyPath+'?limit=2&limit=4',{cookie:author})).status,400);
assert.equal((await request(historyPath,{cookie:outsider})).status,404);
assert.equal((await request(historyPath)).status,401);
const earlyText=await request(historyPath+'/1',{cookie:author});
assert.equal(earlyText.status,200);
assert.ok(earlyText.data.revision.text.includes('Première rédaction'));
assert.equal(earlyText.data.revision.isCurrent,false);
const latestText=await request(historyPath+'/2',{cookie:author});
assert.equal(latestText.status,200);
assert.ok(latestText.data.revision.text.includes('Deuxième rédaction'));
assert.equal(latestText.data.revision.isCurrent,true);
assert.equal((await request(historyPath+'/1',{cookie:outsider})).status,404);
assert.equal((await request(historyPath+'/999',{cookie:author})).status,404);
assert.equal((await request(historyPath+'/abc',{cookie:author})).status,400);
// BS-008e: private deterministic word diff between any two SAVED chapter revisions.
const compareSavedPath=historyPath+'/compare?from=1&to=2';
const compared=await request(compareSavedPath,{cookie:author});
assert.equal(compared.status,200,'compare two saved revisions in current chapter');
assert.equal(compared.data.from.sequence,1);
assert.equal(compared.data.to.sequence,2);
assert.equal(compared.data.comparison.algorithm,'word-lcs-bounded-v1');
const cmpSegments=compared.data.comparison.segments;
assert.equal(cmpSegments.filter(s=>s.kind!=='added').map(s=>s.text).join(''),
  earlyText.data.revision.text,'diff preserves exact left revision text');
assert.equal(cmpSegments.filter(s=>s.kind!=='removed').map(s=>s.text).join(''),
  latestText.data.revision.text,'diff preserves exact right revision text');
assert.ok(compared.data.comparison.counts.added>0&&
  compared.data.comparison.counts.removed>0,'rewritten text counts added/removed units');
assert.equal(JSON.stringify(compared.data).includes('contentHash'),false,
  'compare API never exposes revision content hashes');
const reversed=await request(historyPath+'/compare?from=2&to=1',{cookie:author});
assert.equal(reversed.status,200,'reverse comparison is supported');
assert.equal(reversed.data.comparison.counts.added,compared.data.comparison.counts.removed);
assert.equal((await request(compareSavedPath,{cookie:outsider})).status,404,
  'cross-workspace revision diff denied');
assert.equal((await request(compareSavedPath)).status,401,
  'revision diff requires session');
assert.equal((await request(historyPath+'/compare?from=1&to=1',{cookie:author})).status,400);
assert.equal((await request(historyPath+'/compare?from=abc&to=2',{cookie:author})).status,400);
assert.equal((await request(historyPath+'/compare?from=1&from=2&to=2',{cookie:author})).status,400);
assert.equal((await request(historyPath+'/compare?from=1&to=2&extra=x',{cookie:author})).status,400);
assert.equal((await request(historyPath+'/compare?from=1&to=999',{cookie:author})).status,404);
assert.equal((await request(historyPath,{cookie:author})).data.currentRevision,2,
  'read-only diff does not alter revision pointers');
// Format-only or identical text after a restore is not a prose addition/removal.

const versionItems=await request('/api/v1/books',{cookie:author});
const historyMetadata=versionItems.data.books.find(b=>b.id===historyBookId);
assert.ok(historyMetadata?.updatedAt);
const historyWriting=await request('/api/v1/books/'+historyBookId,{
 method:'PATCH',cookie:author,
 body:{action:'status',status:'WRITING',expectedUpdatedAt:historyMetadata.updatedAt}});
assert.equal(historyWriting.status,200,'book status must progress before restoration');
const revisionRestorePath=historyPath+'/1';
assert.equal((await request(revisionRestorePath,{method:'POST',
 body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:2}})).status,401);
assert.equal((await request(revisionRestorePath,{method:'POST',cookie:outsider,
 body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:2}})).status,404);
assert.equal((await request(revisionRestorePath,{method:'POST',cookie:author,
 omitOrigin:true,body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:2}})).status,403);
assert.equal((await request(revisionRestorePath,{method:'POST',cookie:author,
 body:{confirm:'RESTORE_CHAPTER',expectedRevision:2}})).status,400);
assert.equal((await request(revisionRestorePath,{method:'POST',cookie:author,
 body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:1}})).status,409,
 'stale editor revision must not restore content');
const historyRestore=await request(revisionRestorePath,{method:'POST',cookie:author,
 body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:2}});
assert.equal(historyRestore.status,200,'append-only chapter restoration works');
assert.equal(historyRestore.data.revision,3);
assert.equal(historyRestore.data.restoredFrom,1);
const currentAfterHistory=await request(historyChapterPath,{cookie:author});
assert.equal(currentAfterHistory.status,200);
assert.equal(currentAfterHistory.data.chapter.revision,3);
assert.deepEqual(currentAfterHistory.data.chapter.content,firstDoc,
 'current revision contains selected historical text');
assert.equal((await request(historyPath+'/1',{cookie:author})).data.revision.text,
 earlyText.data.revision.text,'source history immutable');
assert.equal((await request(historyPath+'/2',{cookie:author})).data.revision.text,
 latestText.data.revision.text,'intermediate revision immutable');
const sameTextCompare=await request(historyPath+'/compare?from=1&to=3',{cookie:author});
assert.equal(sameTextCompare.status,200,'restored revision can be compared to source');
assert.equal(sameTextCompare.data.comparison.counts.added,0);
assert.equal(sameTextCompare.data.comparison.counts.removed,0);
assert.equal(sameTextCompare.data.comparison.formattingMayDiffer,false);

const bookAfterHistoryRestore=await request('/api/v1/books/'+historyBookId+'/editions',
 {cookie:author});
assert.equal(bookAfterHistoryRestore.data.status,'DRAFT',
 'restoring a historical text invalidates old editorial approval/status');
assert.equal((await request(revisionRestorePath,{method:'POST',cookie:author,
 body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:2}})).status,409,
 'stale retry is rejected, no duplicate revisions');
assert.equal((await request(historyPath+'/3',{method:'POST',cookie:author,
 body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:3}})).status,422,
 'current revision cannot be restored into itself');
assert.equal((await request(historyPath+'?limit=10',{cookie:author})).data.currentRevision,3);
const historyEditions=await request('/api/v1/books/'+historyBookId+'/editions',{cookie:author});
const historyFork=await request('/api/v1/books/'+historyBookId+'/editions',{
 method:'POST',cookie:author,
 body:{confirm:'CREATE_EDITION_FROM_SAVED',
 expectedEditionId:historyEditions.data.currentEditionId,
 expectedUpdatedAt:historyEditions.data.expectedUpdatedAt}});
assert.equal(historyFork.status,201);
assert.equal((await request(historyPath,{cookie:author})).status,404,
 'revision history of older edition cannot be opened as current');
assert.equal((await request(compareSavedPath,{cookie:author})).status,404,
 'comparison of old edition chapter cannot bypass current-edition ACL');
assert.equal((await request(revisionRestorePath,{method:'POST',cookie:author,
 body:{confirm:'RESTORE_CHAPTER_REVISION',expectedRevision:3}})).status,404,
 'revision history cannot mutate a chapter after edition change');
const oldHistoryPreview=await request('/api/v1/books/'+historyBookId+'/editions/'+
 historyEditions.data.currentEditionId+'/chapters/'+historyChapterId,{cookie:author});
assert.equal(oldHistoryPreview.status,200,'previous edition remains readable');

const noOrigin=await request('/api/v1/books',{method:'POST',cookie:author,body:{title:'Ne doit pas exister'},omitOrigin:true});
assert.equal(noOrigin.status,403,'CSRF prevents cross-origin writes');
const logout=await request('/api/v1/auth/logout',{method:'POST',cookie:author});
assert.equal(logout.status,200,'logout');
const revoked=await request('/api/v1/books',{cookie:author});
assert.equal(revoked.status,401,'revoked sessions cannot access manuscripts');
console.log('E2E API PASS: auth, throttle, CSRF, private search, revision-safe comments, reversible book lifecycle, snapshots, edition comparisons, editions, historical read-only access, restoration, exports and ACL');
