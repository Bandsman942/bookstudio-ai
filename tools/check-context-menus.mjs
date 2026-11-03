import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const menu=file('apps/web/components/ActionMenu.tsx');
for(const contract of [
  'aria-haspopup="menu"','aria-expanded={open}','aria-controls={open?id:undefined}',
  'role="menu"','role="menuitem"','event.key===\'Escape\'','ArrowDown','ArrowUp',
  'Home','End','focusin','pointerdown','triggerRef.current?.focus()'
])assert.ok(menu.includes(contract),'Missing contextual accessibility contract: '+contract);

const surfaces=[
  ['apps/web/components/BookActionsMenu.tsx','<ActionMenu'],
  ['apps/web/components/ChapterActionsMenu.tsx','<ActionMenu'],
  ['apps/web/components/SnapshotsPanel.tsx','<ActionMenu'],
  ['apps/web/components/ArchivesClient.tsx','<ActionMenu'],
  ['apps/web/components/ChapterComments.tsx','<ActionMenu'],
  ['apps/web/components/StudioEditor.tsx','<ActionMenu'],
  ['apps/web/components/LibraryClient.tsx','<BookActionsMenu']
];
for(const [source,contract] of surfaces)
  assert.ok(file(source).includes(contract),'Overflow action missing from '+source);

const overview=file('apps/web/components/BookOverview.tsx');
assert.ok(overview.includes('<BookActionsMenu'),'Book detail must reuse shared book actions');
assert.ok(overview.includes('<ChapterActionsMenu'),'Chapter rows must use overflow menus');
const library=file('apps/web/components/LibraryClient.tsx');
assert.ok(library.includes('<article key={book.id}'),'Book card must be a non-interactive wrapper');
assert.ok(library.includes('className="book-card-link"'),'Book link must remain independent of controls');
assert.ok(!library.includes('<Link key={book.id}'),'No nested interactive buttons in library card links');
const versions=file('apps/web/components/SnapshotsPanel.tsx');
assert.ok(!versions.includes('className="version-actions"'),'No scattered export buttons');
const css=file('apps/web/app/styles.css');
for(const rule of ['.context-menu{','.context-trigger{','.chapter-item-link{','.book-card-overflow{','.versions-list{'])
  assert.ok(css.includes(rule),'Missing responsive styling: '+rule);
const route=file('apps/web/app/api/v1/books/[bookId]/chapters/[chapterId]/metadata/route.ts');
for(const invariant of ['accessToBook(bookId,user.id,true)','isSameOrigin(request)','CHAPTER_RENAMED','updateMany','CHAPTER_CONFLICT'])
  assert.ok(route.includes(invariant),'Missing chapter metadata invariant: '+invariant);
const e2e=file('packages/database/scripts/e2e-api.mjs');
for(const scenario of ['chapter title optimistic concurrency','chapter metadata isolated by membership','chapter metadata CSRF enforced','title rename preserves all text'])
  assert.ok(e2e.includes(scenario),'Missing HTTP E2E chapter scenario: '+scenario);
console.log('Context menu structural contracts OK across',surfaces.length,'surfaces.');
