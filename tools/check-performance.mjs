import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const source=(file)=>fs.readFileSync(path.join(root,file),'utf8');

const region=JSON.parse(source('apps/web/vercel.json'));
assert.deepEqual(region.regions,['pdx1'],'Function region must be reviewed if changed from Neon us-west-2 collocation');

const book=source('apps/web/app/books/[bookId]/page.tsx');
const chapter=source('apps/web/app/books/[bookId]/chapters/[chapterId]/page.tsx');
for(const [file,data] of [['book',book],['chapter',chapter]]){
  assert.equal((data.match(/accessToBook\(/g)??[]).length,1,file+' page must not duplicate deep book access query');
  assert.ok(data.includes('canWriteBook(book)'),file+' page must reuse membership role from existing access query');
}
const auth=source('apps/web/lib/auth.ts');
assert.ok(auth.includes("cache(async () =>"),'Session cache must be request-scoped React cache');
assert.ok(!auth.includes('unstable_cache('),'No global user/session cache');
assert.ok(auth.includes('where:{userId}'),'Memberships must be restricted to current user');

const editor=source('apps/web/components/StudioEditor.tsx');
for(const marker of ['navigator.onLine','retryAtRef.current','retryCountRef.current','conflictRef.current','localStorage.setItem(draftKey','window.addEventListener(\'online\'','serializeTimerRef.current','AbortController','state===\'offline\''])
  assert.ok(editor.includes(marker),'Missing low bandwidth safeguard: '+marker);
assert.ok(!editor.includes('},1400)'),'Old polling loop must not remain');
assert.ok(editor.includes('compact===true&&mobilePanel'),'Hidden mobile comments panel must not mount');
const comments=source('apps/web/components/ChapterComments.tsx');
assert.ok(comments.includes('},[refresh]);'),'Comments fetch should not repeat on every revision');
assert.ok(comments.includes('item.baseRevision!==revision'),'Staleness must update without network');
for(const route of [
  'apps/web/app/library/loading.tsx',
  'apps/web/app/books/[bookId]/loading.tsx',
  'apps/web/app/books/[bookId]/chapters/[chapterId]/loading.tsx'
])assert.ok(fs.existsSync(path.join(root,route)),'Missing route feedback: '+route);
const health=source('apps/web/app/api/health/route.ts');
assert.ok(health.includes('Server-Timing'),'No safe database timing header');
const save=source('apps/web/app/api/v1/books/[bookId]/chapters/[chapterId]/route.ts');
assert.ok(save.includes('Server-Timing'),'No safe confirmed-save timing header');
console.log('Performance contracts OK (not a latency benchmark).');
