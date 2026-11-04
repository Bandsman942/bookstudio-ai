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
  const pdf=await renderReadingPdf('L’avenir de la santé — réflexion française',chapters).catch(error=>{
    throw new Error('13-chapter test uncovered unsupported '+String(error?.codepoints||'unknown'),{cause:error});
  });
  assert.equal(Buffer.from(pdf.subarray(0,5)).toString('ascii'),'%PDF-');
  assert.ok(pdf.byteLength>5000,'all chapters render into a non-trivial PDF');
  const pageCount=(Buffer.from(pdf).toString('latin1').match(/\/Type \/Page\b/g)||[]).length;
  assert.ok(pageCount>=13,'each chapter must begin on a new page');
});

test('PDF exports 13 chapters with the real snapshot Unicode character inventory, including arrows',async()=>{
 const unicodePoints=[233,8217,224,232,234,238,244,249,8212,226,8220,8221,231,192,251,339,8211,
   239,171,187,246,8230,8594,215,176,181,201,202,235,8216];
 // This is only a list of numeric code points: no text from the private manuscript.
 const inventory=unicodePoints.map(cp=>String.fromCodePoint(cp)).join(' ');
 const chapters=Array.from({length:13},(_,i)=>({
   title:'Chapitre '+(i+1)+' — Démonstration →',
   content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:inventory+' → suite '+(i+1)}]}]}
 }));
 const result=await renderReadingPdf('Livre avec symboles →',chapters).catch(error=>{
   throw new Error('Missing font glyph '+String(error?.codepoints||'unknown'),{cause:error});
 });
 assert.equal(Buffer.from(result.subarray(0,5)).toString('ascii'),'%PDF-');
 assert.ok((Buffer.from(result).toString('latin1').match(/\/Type \/Page\b/g)||[]).length>=13);
});

test('Noto bundled symbol subset fontkit coverage of U+2192 is discoverable',async()=>{
 const {default:PDFDocument}=await import('pdfkit');
 const {registerUnicodeFonts}=await import('./pdf-unicode-fonts.ts');
 const doc=new PDFDocument({autoFirstPage:false});
 registerUnicodeFonts(doc);
 const faces=['noto-symbols-400','noto-math-400','noto-classic-symbols-400','latin-400'];
 const checked=Object.fromEntries(faces.map(name=>{
   doc.font(name);
   const face=doc._font?.font;
   return [name,{
     advertised:Boolean(face?.hasGlyphForCodePoint?.(0x2192)),
     glyphId:face?.glyphForCodePoint?.(0x2192)?.id??-1,
     characterSet:Boolean(face?.characterSet?.includes?.(0x2192))
   }];
 }));
 doc.destroy();
 assert.ok(Object.values(checked).some(v=>v.advertised),
   'Fontkit must find U+2192 in a bundled font subset: '+JSON.stringify(checked));
});
