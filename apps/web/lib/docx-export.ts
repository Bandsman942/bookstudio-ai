import { zipSync, strToU8 } from 'fflate';
import { assertValidDocument, safeExternalHref } from '@bookstudio/domain';

type Node = {
  type?:string;
  text?:string;
  attrs?:{level?:number};
  marks?:Array<{type?:string;attrs?:{href?:string}}>;
  content?:Node[];
};
export type ExportChapter={title:string;content:unknown};

const escapeXml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');

function collectLinks(node:Node,map:Map<string,string>) {
  if(node.type==='text'){
    const href=node.marks?.find(mark=>mark.type==='link')?.attrs?.href;
    if(href&&safeExternalHref(href)!==null&&!map.has(href)){
      map.set(href,'rId'+(map.size+2));
    }
  }
  for(const child of node.content??[])collectLinks(child,map);
}

function runs(node:Node,links:Map<string,string>):string {
  if(node.type==='text'){
    const flags=new Set((node.marks??[]).map(mark=>mark.type));
    const href=node.marks?.find(mark=>mark.type==='link')?.attrs?.href;
    const linkId=href?links.get(href):undefined;
    const props=(flags.has('bold')?'<w:b/>':'')+
      (flags.has('italic')?'<w:i/>':'')+
      (flags.has('strike')?'<w:strike/>':'')+
      (flags.has('underline')||linkId?'<w:u w:val="single"/>':'')+
      (linkId?'<w:color w:val="156AB6"/>':'');
    const run='<w:r>'+(props?'<w:rPr>'+props+'</w:rPr>':'')+
      '<w:t xml:space="preserve">'+escapeXml(node.text??'')+'</w:t></w:r>';
    return linkId?'<w:hyperlink r:id="'+linkId+'">'+run+'</w:hyperlink>':run;
  }
  if(node.type==='hardBreak')return '<w:r><w:br/></w:r>';
  return (node.content??[]).map(child=>runs(child,links)).join('');
}

const paragraph=(inner:string,style?:string)=>'<w:p>'+
  (style?'<w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>':'')+inner+'</w:p>';

function paragraphs(node:Node,links:Map<string,string>):string {
  if(node.type==='paragraph')return paragraph(runs(node,links));
  if(node.type==='heading'){
    const level=Math.min(3,Math.max(1,Number(node.attrs?.level??1)));
    return paragraph(runs(node,links),'Heading'+level);
  }
  if(node.type==='blockquote')return paragraph(runs(node,links),'Quote');
  if(node.type==='codeBlock')return paragraph(runs(node,links),'Code');
  if(node.type==='horizontalRule')return paragraph('<w:r><w:t>――――――――――</w:t></w:r>');
  if(node.type==='bulletList'||node.type==='orderedList'){
    const ordered=node.type==='orderedList';
    return (node.content??[]).map((item,index)=>
      paragraph('<w:r><w:t xml:space="preserve">'+(ordered?(index+1)+'. ':'• ')+
        '</w:t></w:r>'+runs(item,links))).join('');
  }
  return (node.content??[]).map(child=>paragraphs(child,links)).join('');
}

export function renderDocx(title:string,chapters:ExportChapter[]):Uint8Array {
  if(!chapters.length)throw new Error('EXPORT_EMPTY');
  const links=new Map<string,string>();
  for(const chapter of chapters){
    assertValidDocument(chapter.content);
    collectLinks(chapter.content as Node,links);
  }
  const body=[
    paragraph('<w:r><w:t xml:space="preserve">'+escapeXml(title)+'</w:t></w:r>','Title'),
    ...chapters.flatMap((chapter,index)=>[
      index>0?paragraph('<w:r><w:br w:type="page"/></w:r>'):'',
      paragraph('<w:r><w:t xml:space="preserve">'+escapeXml(chapter.title)+'</w:t></w:r>','Heading1'),
      paragraphs(chapter.content as Node,links)
    ])
  ].join('');
  const word='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'+
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+
    body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'+
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>'+
    '</w:sectPr></w:body></w:document>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="quote"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="code"/><w:rPr><w:rFonts w:ascii="Courier New"/></w:rPr></w:style>'+
    '</w:styles>';
  const types='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
    '</Types>';
  const rootRels='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
    '</Relationships>';
  const hyperlinkRels=[...links.entries()].map(([href,id])=>
    '<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"'+
    ' Target="'+escapeXml(href)+'" TargetMode="External"/>').join('');
  const wordRels='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    hyperlinkRels+'</Relationships>';
  return zipSync({
    '[Content_Types].xml':strToU8(types),
    '_rels/.rels':strToU8(rootRels),
    'word/document.xml':strToU8(word),
    'word/_rels/document.xml.rels':strToU8(wordRels),
    'word/styles.xml':strToU8(styles)
  },{level:6});
}

const escapeMd=(value:string)=>value.replace(/([\\\x60*_[\]<>])/g,'\\$1');
function markdownInline(node:Node):string {
  if(node.type==='hardBreak')return '  \n';
  if(node.type==='text'){
    let result=escapeMd(node.text??'');
    const marks=new Set((node.marks??[]).map(mark=>mark.type));
    const href=node.marks?.find(mark=>mark.type==='link')?.attrs?.href;
    if(marks.has('code'))result='\x60'+(node.text??'').replace(/\x60/g,'\\\x60')+'\x60';
    if(marks.has('bold'))result='**'+result+'**';
    if(marks.has('italic'))result='*'+result+'*';
    if(marks.has('strike'))result='~~'+result+'~~';
    if(marks.has('underline'))result='<u>'+result+'</u>';
    if(href&&safeExternalHref(href))result='['+result+']('+href.replace(/\)/g,'%29')+')';
    return result;
  }
  return (node.content??[]).map(markdownInline).join('');
}
function markdownBlocks(node:Node):string[] {
  if(node.type==='paragraph')return [markdownInline(node)];
  if(node.type==='heading')return ['#'.repeat(Math.min(6,Math.max(1,Number(node.attrs?.level??1))))+' '+markdownInline(node)];
  if(node.type==='blockquote')return ['> '+markdownInline(node)];
  if(node.type==='codeBlock')return ['\x60\x60\x60\n'+(node.content??[]).map(n=>n.text??'').join('')+'\n\x60\x60\x60'];
  if(node.type==='bulletList'||node.type==='orderedList')return (node.content??[]).map((n,i)=>
    (node.type==='bulletList'?'- ':(i+1)+'. ')+markdownInline(n));
  if(node.type==='horizontalRule')return ['---'];
  return (node.content??[]).flatMap(markdownBlocks);
}
export function renderMarkdown(title:string,chapters:ExportChapter[]):string {
  return ['# '+escapeMd(title),...chapters.flatMap(chapter=>{
    assertValidDocument(chapter.content);
    return ['## '+escapeMd(chapter.title),...markdownBlocks(chapter.content as Node)];
  })].join('\n\n')+'\n';
}
