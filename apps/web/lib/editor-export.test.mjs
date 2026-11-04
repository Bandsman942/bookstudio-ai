import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {renderDocx,renderMarkdown} from './docx-export.ts';
import {renderReadingPdf} from './pdf-export.ts';

const document={
  type:'doc',
  content:[
    {type:'heading',attrs:{level:3},content:[{type:'text',text:'Sources'}]},
    {type:'paragraph',content:[
      {type:'text',text:'source officielle',marks:[
        {type:'underline'},
        {type:'link',attrs:{href:'https://example.org/article?l=fr&ref=1'}}
      ]},
      {type:'text',text:' et contexte',marks:[{type:'bold'}]}
    ]}
  ]
};

test('DOCX export contains valid external relationship and underlined run',()=>{
  const zip=unzipSync(renderDocx('Mon livre',[{title:'Chapitre 1',content:document}]));
  const xml=strFromU8(zip['word/document.xml']);
  const rels=strFromU8(zip['word/_rels/document.xml.rels']);
  assert.match(xml,/<w:hyperlink r:id="rId2">/);
  assert.match(xml,/<w:u w:val="single"\/>/);
  assert.match(xml,/<w:pStyle w:val="Heading3"\/>/);
  assert.match(rels,/Target="https:\/\/example\.org\/article\?l=fr&amp;ref=1" TargetMode="External"/);
  assert.match(xml,/<w:t xml:space="preserve">source officielle<\/w:t>/);
});
test('Markdown export preserves external links and underline with explicit markup',()=>{
  const md=renderMarkdown('Mon livre',[{title:'Chapitre 1',content:document}]);
  assert.match(md,/### Sources/);
  assert.ok(md.includes('[<u>source officielle</u>](https://example.org/article?l=fr&ref=1)'));
  assert.ok(md.includes('** et contexte**'));
});
test('DOCX exporter rejects executable URL marks',()=>{
  const invalid={type:'doc',content:[{type:'paragraph',content:[
    {type:'text',text:'XSS',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}
  ]}]};
  assert.throws(()=>renderDocx('Titre',[{title:'Chapitre 1',content:invalid}]),/DOCUMENT_UNSAFE_LINK/);
});

test('PDF reading export keeps a valid non-empty PDF with inline style and link',async()=>{
  const bytes=await renderReadingPdf('Mon livre',[{title:'Chapitre 1',content:document}]);
  assert.ok(bytes.byteLength>600);
  assert.equal(Buffer.from(bytes.subarray(0,5)).toString('ascii'),'%PDF-');
});

test('PDF supports 13 French chapters with typographic spaces and Greek Unicode',async()=>{
  const chapters=Array.from({length:13},(_,i)=>({
    title:'Chapitre '+(i+1)+' — L’intelligence et la santé',
    content:{type:'doc',content:[{type:'paragraph',content:[
      {type:'text',text:'Depuis l’enfance, j’aime l’informatique\u202f: «\u00a0médecine\u00a0» et α, β, π.'},
      {type:'text',text:' — analyse approfondie.',marks:[{type:'bold'}]}
    ]}]}
  }));
  const pdf=await renderReadingPdf('L’avenir de la santé — réflexion française',chapters);
  assert.equal(Buffer.from(pdf.subarray(0,5)).toString('ascii'),'%PDF-');
  assert.ok(pdf.byteLength>5000,'all chapters render into a non-trivial PDF');
  const pageCount=(Buffer.from(pdf).toString('latin1').match(/\/Type \/Page\b/g)||[]).length;
  assert.ok(pageCount>=13,'each chapter must begin on a new page');
});
