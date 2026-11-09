import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fromFile=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
// Static wiring contract: not a substitute for a physical mobile visual E2E.
test('all four central workspace pages use ONE accessible hamburger shell',()=>{
 for(const path of ['components/LibraryClient.tsx','components/ArchivesClient.tsx',
   'app/books/[bookId]/page.tsx','app/search/page.tsx']){
   const file=fromFile(path);
   assert.match(file,/import WorkspaceShell from/,'shared client drawer in '+path);
   assert.match(file,/<WorkspaceShell sidebar=\{<aside className="nav">/,
     'desktop sidebar and mobile drawer share the same menu entries: '+path);
   assert.match(file,/<\/WorkspaceShell>/);
 }
 const shell=fromFile('components/WorkspaceShell.tsx');
 for(const token of ['aria-expanded={open}','aria-controls="workspace-mobile-drawer"',
   "event.key==='Escape'","event.key!=='Tab'","setOpen(false)",
   'workspace-mobile-backdrop','workspace-drawer-close',
   "document.body.style.overflow='hidden'"]){
   assert.ok(shell.includes(token),'accessible mobile toggle '+token);
 }
});
test('studio chapter drawer stays discoverable, safe and scrollable',()=>{
 const studio=fromFile('components/StudioEditor.tsx');
 const css=fromFile('app/styles.css');
 for(const token of ['studio-nav-toggle','aria-controls="studio-manuscript-nav"',
   'navToggleRef','navListRef','canLeaveEditor']){
   assert.ok(studio.includes(token),'Studio navigation contract: '+token);
 }
 for(const token of ['.studio.studio-focus.studio-mobile-navigation-open',
   '.mobile-workspace-open .workspace-drawer-host',
   '.mobile-workspace-open .workspace-drawer-host .nav-chapter-list',
   'env(safe-area-inset-left','min(330px,calc(100vw - 34px))']){
   assert.ok(css.includes(token),'mobile styles: '+token);
 }
});
