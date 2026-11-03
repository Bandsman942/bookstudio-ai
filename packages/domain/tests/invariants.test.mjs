import test from 'node:test';
import assert from 'node:assert/strict';
import { may, normalizeTitle, plainText, assertValidDocument, safeExternalHref, decideSave, transitionAllowed, emptyDocument } from '../src/index.ts';
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

test('rich editor: underline and safe links survive domain validation', () => {
  const manuscript={
    type:'doc',content:[
      {type:'heading',attrs:{level:3},content:[{type:'text',text:'Sources'}]},
      {type:'paragraph',content:[
        {type:'text',text:'Souligné',marks:[{type:'underline'}]},
        {type:'text',text:' https://exemple.org',marks:[
          {type:'link',attrs:{href:'https://exemple.org/article?q=1&lang=fr',target:'_blank',rel:'noopener noreferrer nofollow'}}
        ]}
      ]}
    ]
  };
  assert.doesNotThrow(()=>assertValidDocument(manuscript));
  assert.equal(plainText(manuscript),'Sources\nSouligné https://exemple.org');
});
test('reject protocol exploits and arbitrary attributes in edition links', () => {
  for(const href of [
    'javascript:alert(1)','data:text/html,hello','file:///etc/passwd','https://admin:secret@example.com',
    'https://example.org/%0d%0aX','mailto:contact@example.org?subject=%0Dinject'
  ]){
    assert.equal(safeExternalHref(href),null,href+' must be rejected');
    assert.throws(()=>assertValidDocument({type:'doc',content:[
      {type:'paragraph',content:[{type:'text',text:'malicious',marks:[{type:'link',attrs:{href}}]}]}
    ]}),/DOCUMENT_UNSAFE_LINK/);
  }
  assert.equal(safeExternalHref('https://example.org/path?q=one'), 'https://example.org/path?q=one');
  assert.equal(safeExternalHref('mailto:hello@example.org'),'mailto:hello@example.org');
  assert.throws(()=>assertValidDocument({type:'doc',content:[
    {type:'paragraph',content:[{type:'text',text:'attrs',marks:[
      {type:'link',attrs:{href:'https://example.org',onmouseover:'alert(1)'}}
    ]}]}
  ]}),/DOCUMENT_UNSAFE_LINK/);
});
