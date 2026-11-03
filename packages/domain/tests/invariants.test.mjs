import test from 'node:test';
import assert from 'node:assert/strict';
import { may, normalizeTitle, plainText, assertValidDocument, decideSave, transitionAllowed, emptyDocument, normalizeEditorHref } from '../src/index.ts';
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

test('rich editor supports underline and valid links while retaining exact text',()=>{
  const document={type:'doc',content:[{type:'paragraph',content:[
    {type:'text',text:'Proof',marks:[{type:'underline'}]},
    {type:'text',text:' and reference',marks:[{type:'link',attrs:{
      href:'https://example.org/reference',target:'_blank',rel:'noopener noreferrer nofollow',class:null
    }}]}
  ]}]};
  assertValidDocument(document);
  assert.equal(plainText(document),'Proof and reference');
});
test('rich editor rejects javascript URLs, dangerous targets and credentials',()=>{
  assert.equal(normalizeEditorHref('javascript:alert(1)'),null);
  assert.equal(normalizeEditorHref('data:text/html,hello'),null);
  assert.equal(normalizeEditorHref('https://user:password@example.org'),null);
  assert.equal(normalizeEditorHref('mailto:author@example.org'),'mailto:author@example.org');
  const link=(attrs)=>({type:'doc',content:[{type:'paragraph',content:[
    {type:'text',text:'Link',marks:[{type:'link',attrs}]}
  ]}]});
  assert.throws(()=>assertValidDocument(link({href:'javascript:alert(1)',target:'_blank',rel:'noopener noreferrer'})),/DOCUMENT_UNSAFE_LINK/);
  assert.throws(()=>assertValidDocument(link({href:'https://example.org',target:'_blank',rel:'nofollow'})),/DOCUMENT_UNSAFE_LINK/);
  assert.throws(()=>assertValidDocument(link({href:'https://example.org',target:'_top'})),/DOCUMENT_UNSAFE_LINK/);
  assert.throws(()=>assertValidDocument({type:'doc',content:[{type:'paragraph',content:[
    {type:'text',text:'Unsafe',marks:[{type:'image'}]}
  ]}]}),/DOCUMENT_UNSUPPORTED_MARK/);
});
