import test from 'node:test';
import assert from 'node:assert/strict';
import {explainActionError} from './notification-copy.ts';
test('PDF unsupported glyph diagnostics are contextual and never echo raw chapter text',()=>{
 const fr=explainActionError({locale:'fr',operation:'pdf',status:422,
   code:'EXPORT_UNSUPPORTED_GLYPHS',codepoints:'U+2192,<script>,U+202F',chapterNumber:7});
 assert.match(fr,/U\+2192/);assert.match(fr,/chapitre 7/);
 assert.doesNotMatch(fr,/<script>/);
 const en=explainActionError({locale:'en',operation:'pdf',code:'EXPORT_UNSUPPORTED_GLYPHS',
   codepoints:'U+2192',chapterNumber:7});
 assert.match(en,/chapter 7/);
});
test('action- and status-specific remedies cover permissions, conflicts, offline, source scan',()=>{
 assert.match(explainActionError({locale:'fr',operation:'source-upload',status:403}),/autorisation/i);
 assert.match(explainActionError({locale:'fr',operation:'snapshot-restore',status:409}),/intégrité|concurrent/);
 assert.match(explainActionError({locale:'fr',operation:'docx-import',status:423}),/antivirus/i);
 assert.match(explainActionError({locale:'en',operation:'editor-save',status:0}),/connection/i);
 assert.match(explainActionError({locale:'en',operation:'comment-change',status:429}),/Too many/);
});
