import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=name=>fs.readFileSync(path.join(process.cwd(),name),'utf8');
const ribbon=read('apps/web/components/EditorRibbon.tsx');
const studio=read('apps/web/components/StudioEditor.tsx');
const domain=read('packages/domain/src/index.ts');
const docx=read('apps/web/lib/docx-export.ts');
const pdf=read('apps/web/lib/pdf-export.ts');
const css=read('apps/web/app/styles.css');
for(const marker of [
  'useEditorState','role="tablist"','role="tab"','role="tabpanel"',
  'aria-pressed={pressed}','aria-label={label}','toggleBold','toggleItalic',
  'toggleUnderline','toggleStrike','toggleOrderedList','toggleBulletList',
  'toggleCodeBlock','toggleBlockquote','setHorizontalRule','setHardBreak',
  'unsetAllMarks','setLink','unsetLink','safeExternalHref'
])assert.ok(ribbon.includes(marker),'Missing accessible ribbon contract: '+marker);
assert.ok(studio.includes('<EditorRibbon editor={editor} canEdit={canEdit}/>'));
assert.ok(!studio.includes('className="toolbar"'),'Old scattered toolbar still mounted');
assert.ok(studio.includes('autolink:false')&&studio.includes('linkOnPaste:false'),
  'Safe links must only be inserted by an explicit command');
assert.ok(domain.includes('DOCUMENT_UNSAFE_LINK'),'Missing server-side URI validation');
assert.ok(docx.includes('TargetMode="External"'),'Missing DOCX relationship');
assert.ok(docx.includes('w:hyperlink r:id'),'Missing DOCX hyperlink run');
assert.ok(pdf.includes('underline:flags.has')||pdf.includes('underline:span.flags.has'),
  'PDF must support underlines for Unicode-rich spans');
for(const marker of ['.ribbon-tabs','.ribbon-scroll','.ribbon-tool:focus-visible',
  'background:var(--surface)','@media(max-width:760px)'])
  assert.ok(css.includes(marker),'Missing responsive dark-theme ribbon style '+marker);
for(const pathName of [
  'docs/design/EDITOR-RIBBON.md','docs/qa/E2E-EDITOR-RIBBON.md',
  'apps/web/lib/editor-export.test.mjs'
])assert.ok(fs.existsSync(path.join(process.cwd(),pathName)),'Missing QA artifact '+pathName);
console.log('Rich editor ribbon structural/security contracts passed.');
