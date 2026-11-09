import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../app/styles.css',import.meta.url),'utf8');
const studio=readFileSync(new URL('../components/StudioEditor.tsx',import.meta.url),'utf8');
const outline=readFileSync(new URL('../components/ChapterSectionOutline.tsx',import.meta.url),'utf8');

test('Studio viewport cannot leave a document-level blank scroll below the editor',()=>{
 assert.match(css,/\.studio\{position:fixed;inset:0;/);
 assert.match(css,/height:100dvh;min-height:0;max-width:100vw/);
 assert.match(css,/\.studio \.editor-scroll\{min-height:0;flex:1 1 0;overflow:auto;/);
 assert.match(css,/\.studio>\.studio-insights\{height:100%;min-height:0;overflow-y:auto;/);
});
test('both Studio navigation modes retain independent scrolling and a compact header',()=>{
 assert.match(studio,/className="studio-nav-context"/);
 assert.match(css,/\.studio-nav-context\{display:flex;flex-direction:column;flex:0 1 auto;/);
 assert.match(css,/\.studio>\.studio-sidebar \.chapter-navigation,/);
 assert.match(css,/\.studio>\.studio-sidebar \.chapter-outline-list\{flex:1 1 0;min-height:0\}/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/-webkit-overflow-scrolling:touch/);
});
test('no H1-H3 titles are not mistaken for missing chapters',()=>{
 assert.match(outline,/Aucune section structurée dans ce chapitre/);
 assert.match(outline,/paragraphes au style « Normal »/);
 assert.match(outline,/Consulter le sommaire global du livre/);
 assert.match(outline,/onClick=\{onNavigate\}/);
 assert.match(studio,/bookId=\{bookId\} onNavigate=\{protectNavigation\}/);
});
