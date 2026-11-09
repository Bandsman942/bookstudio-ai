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
test('tablet breakpoint and drawer lifecycle stay in sync',()=>{
 const shell=fromFile('components/WorkspaceShell.tsx');
 const studio=fromFile('components/StudioEditor.tsx');
 const css=fromFile('app/styles.css');
 for(const source of [shell,studio]){
   assert.ok(source.includes("matchMedia('(max-width: 900px)')"),
     'drawer closes at the same 900px breakpoint as tablet CSS');
   assert.ok(source.includes("mobile.addEventListener('change',closeOnDesktop)"),
     'drawer closes after device rotates from portrait to desktop');
   assert.ok(source.includes("mobile.removeEventListener('change',closeOnDesktop)"),
     'resize listener is removed at unmount');
 }
 assert.match(css, /@media \(min-width:761px\) and \(max-width:900px\)/);
 assert.ok(css.includes('.mobile-workspace.mobile-workspace-open .workspace-drawer-host'));
 assert.ok(css.includes('.studio.studio-mobile-navigation-open .studio-sidebar'));
 assert.ok(css.includes('safe-area-inset-top'));
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
   'env(safe-area-inset-left','min(330px,calc(100vw - 34px))',
   '@media (min-width:761px) and (max-width:900px)']){
   assert.ok(css.includes(token),'mobile styles: '+token);
 }
});
