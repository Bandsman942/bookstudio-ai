import test from 'node:test';
import assert from 'node:assert/strict';
import { may, normalizeTitle, plainText, assertValidDocument, decideSave, transitionAllowed, emptyDocument } from '../src/index.ts';
test('ACL: reviewer cannot overwrite chapters; owner can', () => {
  assert.equal(may('REVIEWER', 'chapter:write'), false);
  assert.equal(may('OWNER', 'chapter:write'), true);
  assert.equal(may(null, 'book:read'), false);
});
test('normalizes titles and rejects blank or enormous names', () => {
  assert.equal(normalizeTitle('  Mon    Livre  '), 'Mon Livre');
  assert.throws(() => normalizeTitle(' '), /TITLE_INVALID/);
  assert.throws(() => normalizeTitle('a'.repeat(500)), /TITLE_INVALID/);
});
test('structured editor content to text without losing words', () => {
  const doc={type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Introduction'}]},{type:'paragraph',content:[{type:'text',text:'Bonjour '},{type:'text',text:'monde',marks:[{type:'bold'}]}]}]};
  assertValidDocument(doc);
  assert.equal(plainText(doc),'Introduction\nBonjour monde');
  assert.deepEqual(emptyDocument(),{type:'doc',content:[{type:'paragraph'}]});
});
test('unsupported executable-like node rejected', () => {
  assert.throws(() => assertValidDocument({type:'doc',content:[{type:'script',attrs:{onload:'evil'}}]}),/DOCUMENT_UNSUPPORTED_NODE/);
});
test('revision conflict is never silently overwritten', () => {
  assert.equal(decideSave(3,3),4);
  assert.throws(() => decideSave(2,3),/REVISION_CONFLICT/);
  assert.throws(() => decideSave(-1,0),/REVISION_INVALID/);
});
test('publication pipeline restricts transitions', () => {
  assert.equal(transitionAllowed('WRITING','REVIEW'),true);
  assert.equal(transitionAllowed('WRITING','PUBLISHED'),false);
});
