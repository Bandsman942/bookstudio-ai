import { zipSync, strToU8 } from 'fflate';
import { assertValidDocument } from '@bookstudio/domain';

type Node = { type?: string; text?: string; attrs?: {level?: number}; marks?: Array<{type?:string}>; content?: Node[] };
export type ExportChapter={title:string;content:unknown};

const escapeXml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');

function runs(node:Node):string {
  if(node.type==='text'){
    const flags=new Set((node.marks??[]).map(m=>m.type));
    const props=(flags.has('bold')?'<w:b/>':'')+(flags.has('italic')?'<w:i/>':'')+(flags.has('strike')?'<w:strike/>':'');
    return '<w:r>'+(props?'<w:rPr>'+props+'</w:rPr>':'')+'<w:t xml:space="preserve">'+escapeXml(node.text??'')+'</w:t></w:r>';
  }
  if(node.type==='hardBreak')return '<w:r><w:br/></w:r>';
  return (node.content??[]).map(runs).join('');
}

const p=(inner:string,style?:string)=>'<w:p>'+(style?'<w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>':'')+inner+'</w:p>';

function paragraphs(node:Node):string {
  if(node.type==='paragraph')return p(runs(node));
  if(node.type==='heading'){
    const level=Math.min(3,Math.max(1,Number(node.attrs?.level??1)));
    return p(runs(node),'Heading'+level);
  }
  if(node.type==='blockquote')return p(runs(node),'Quote');
  if(node.type==='codeBlock')return p(runs(node),'Code');
  if(node.type==='horizontalRule')return p('<w:r><w:t>――――――――――</w:t></w:r>');
  if(node.type==='bulletList'||node.type==='orderedList'){
    const ordered=node.type==='orderedList';
    return (node.content??[]).map((item,i)=>p('<w:r><w:t xml:space="preserve">'+(ordered?(i+1)+'. ':'• ')+'</w:t></w:r>'+runs(item))).join('');
  }
  return (node.content??[]).map(paragraphs).join('');
}

export function renderDocx(title:string,chapters:ExportChapter[]):Uint8Array {
  if(!chapters.length)throw new Error('EXPORT_EMPTY');
  const body=[
    p('<w:r><w:t xml:space="preserve">'+escapeXml(title)+'</w:t></w:r>','Title'),
    ...chapters.flatMap((c,i)=>{
      assertValidDocument(c.content);
      return [
        i>0?p('<w:r><w:br w:type="page"/></w:r>'):'',
        p('<w:r><w:t xml:space="preserve">'+escapeXml(c.title)+'</w:t></w:r>','Heading1'),
        paragraphs(c.content as Node)
      ];
    })
  ].join('');
  const word='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
   +'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
   +body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    +'<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style>'
    +'<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>'
    +'<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>'
    +'<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/></w:rPr></w:style>'
    +'</w:styles>';
  const types='<?xml version="1.0" encoding="UTF-8"?>'
    +'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    +'<Default Extension="xml" ContentType="application/xml"/>'
    +'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    +'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    +'</Types>';
  const rootRels='<?xml version="1.0" encoding="UTF-8"?>'
    +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    +'</Relationships>';
  const wordRels='<?xml version="1.0" encoding="UTF-8"?>'
    +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    +'</Relationships>';
  return zipSync({
    '[Content_Types].xml':strToU8(types),
    '_rels/.rels':strToU8(rootRels),
    'word/document.xml':strToU8(word),
    'word/_rels/document.xml.rels':strToU8(wordRels),
    'word/styles.xml':strToU8(styles)
  },{level:6});
}

function plain(node:Node):string {
  if(node.type==='text')return node.text??'';
  if(node.type==='hardBreak')return '\n';
  return (node.content??[]).map(plain).join('');
}

function markdownBlocks(node:Node):string[] {
  if(node.type==='paragraph')return [plain(node)];
  if(node.type==='heading')return ['#'.repeat(Math.min(6,Math.max(1,Number(node.attrs?.level??1))))+' '+plain(node)];
  if(node.type==='blockquote')return ['> '+plain(node)];
  if(node.type==='codeBlock')return ['\u0060\u0060\u0060\n'+plain(node)+'\n\u0060\u0060\u0060'];
  if(node.type==='bulletList'||node.type==='orderedList')return (node.content??[]).map((n,i)=>(node.type==='bulletList'?'- ':(i+1)+'. ')+plain(n));
  return (node.content??[]).flatMap(markdownBlocks);
}

export function renderMarkdown(title:string,chapters:ExportChapter[]):string {
  return ['# '+title,...chapters.flatMap(c=>{
    assertValidDocument(c.content);
    return ['## '+c.title,...markdownBlocks(c.content as Node)];
  })].join('\n\n')+'\n';
}
