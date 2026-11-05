import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),load=file=>fs.readFileSync(path.join(root,file),'utf8');
const lib=load('apps/web/components/LibraryClient.tsx');
const overview=load('apps/web/components/BookOverview.tsx');
const book=load('apps/web/app/books/[bookId]/page.tsx');
const sources=load('apps/web/components/BookSourceFiles.tsx');
const dialog=load('apps/web/components/ManuscriptImportDialog.tsx');
const helper=load('apps/web/lib/source-upload-client.ts');
const icons=load('apps/web/components/AppIcon.tsx');
const css=load('apps/web/app/styles.css');
const i18n=load('apps/web/lib/i18n.ts');
for(const marker of ['library.importManuscript','setImporting(true)','<ManuscriptImportDialog','items.filter(book=>book.editable)'])
  assert.ok(lib.includes(marker),'Import CTA must be visible and scoped to writable books: '+marker);
assert.ok(overview.includes('<BookSourceFiles')&&
  overview.indexOf('<BookSourceFiles')<overview.indexOf('className="overview-cards"'),
  'Source panel must appear BEFORE the lengthy book structure and cards');
assert.ok(book.includes('href="#book-source-files"'),'Book sidebar must link to source files');
for(const marker of ['id="book-source-files"','source-dropzone','onDrop','type="file"','uploadSourceToBook',
 'MANUSCRIPT_ACCEPT','role="alert"','editable&&','source-disclaimer'])
  assert.ok(sources.includes(marker),'Missing accessible source panel '+marker);
for(const marker of ['onCreateBook','onUploaded','books.map','uploadSourceToBook','import.notConverted'])
  assert.ok(dialog.includes(marker),'Library import dialog missing '+marker);
for(const marker of ["method:'PUT'","action:'confirm'",'MANUSCRIPT_MAX_BYTES','supabase\\.co',
 'SOURCE_SIGN_FAILED'])
  assert.ok(helper.includes(marker),'Client must use protected v0.9 upload flow '+marker);
for(const marker of ['stroke="currentColor"','aria-hidden="true"','AppIconName'])
  assert.ok(icons.includes(marker),'Shared SVG icon contract missing '+marker);
for(const file of ['apps/web/components/LibraryClient.tsx','apps/web/app/books/[bookId]/page.tsx',
  'apps/web/components/ArchivesClient.tsx','apps/web/app/search/page.tsx',
  'apps/web/components/StudioEditor.tsx'])
  assert.ok(load(file).includes('<AppIcon'),'Module/submodule missing consistent icon '+file);
for(const marker of ['--surface-muted','.source-dropzone','.library-primary-actions',
 '.import-modal','@media(max-width:460px)'])
  assert.ok(css.includes(marker),'Responsive accessible import CSS missing '+marker);
for(const key of ["'library.importManuscript'","'import.title'","'import.notConverted'","'book.sourcesNav'"])
  assert.equal(i18n.split(key).length,3,'Both locale catalogs must translate '+key);
console.log('Manuscript import affordance, Supabase flow and professional SVG icons: OK');
