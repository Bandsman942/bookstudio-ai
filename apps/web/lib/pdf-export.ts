import PDFDocument from 'pdfkit';
import {assertValidDocument,safeExternalHref} from '@bookstudio/domain';
import type {ExportChapter} from './docx-export';

type Node = {type?:string;text?:string;attrs?:{level?:number};
  marks?:Array<{type?:string;attrs?:{href?:string}}> ;content?:Node[]};
const unsupportedGlyph=/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u2013-\u2014\u2018-\u201A\u201C-\u201E\u2022\u2026\u20AC]/u;
export class UnsupportedPdfGlyph extends Error {
  constructor() {super('EXPORT_UNSUPPORTED_GLYPHS');}
}
function verifyGlyphs(text:string) {
  // PDFKit core fonts use WinAnsi; do not silently replace unrepresentable glyphs.
  if(unsupportedGlyph.test(text))throw new UnsupportedPdfGlyph();
}
function plain(node:Node):string {
  if(node.type==='text')return node.text??'';
  if(node.type==='hardBreak')return '\n';
  return (node.content??[]).map(plain).join('');
}
type TextSegment={text:string;marks:Node['marks']};
function segments(node:Node):TextSegment[]{
  if(node.type==='text')return [{text:node.text??'',marks:node.marks}];
  if(node.type==='hardBreak')return [{text:'\n',marks:[]}];
  return (node.content??[]).flatMap(segments);
}
function richLine(doc:PDFKit.PDFDocument,node:Node,opts:{
  font:string;size:number;color:string;gap:number;indent?:number;prefix?:string
}){
  const spans=segments(node).filter(span=>span.text.length>0);
  if(opts.prefix)spans.unshift({text:opts.prefix,marks:[]});
  if(!spans.length)spans.push({text:' ',marks:[]});
  for(let i=0;i<spans.length;i++){
    const span=spans[i];
    verifyGlyphs(span.text);
    const flags=new Set((span.marks??[]).map(mark=>mark.type));
    const raw=span.marks?.find(mark=>mark.type==='link')?.attrs?.href;
    const href=raw?safeExternalHref(raw):null;
    const bold=flags.has('bold'),italic=flags.has('italic');
    const font=flags.has('code')?'Courier':
      opts.font.startsWith('Times')?(bold&&italic?'Times-BoldItalic':bold?'Times-Bold':italic?'Times-Italic':opts.font):
      opts.font;
    doc.font(font).fontSize(opts.size).fillColor(href?'#156AB6':opts.color);
    // PDFKit explicitly accepts link:null to stop a previous linked segment.
    doc.text(span.text,{
      continued:i<spans.length-1,
      lineGap:3,
      paragraphGap:i===spans.length-1?opts.gap:0,
      indent:i===0?(opts.indent??0):0,
      underline:flags.has('underline')||Boolean(href),
      strike:flags.has('strike'),
      link:href
    } as PDFKit.Mixins.TextOptions);
  }
}

function writeBlocks(doc:PDFKit.PDFDocument,node:Node) {
  if(node.type==='paragraph'){
    richLine(doc,node,{font:'Times-Roman',size:11.5,color:'#20252D',gap:10});
  } else if(node.type==='heading') {
    const level=Math.max(1,Math.min(3,Number(node.attrs?.level??1)));
    const size=level===1?20:level===2?15:13;
    doc.moveDown(.55);
    richLine(doc,node,{font:'Helvetica-Bold',size,color:'#182B39',gap:8});
  } else if(node.type==='blockquote'){
    richLine(doc,node,{font:'Times-Italic',size:11,color:'#596C73',gap:10,indent:18});
  } else if(node.type==='codeBlock'){
    const value=plain(node);verifyGlyphs(value);
    doc.font('Courier').fontSize(9).fillColor('#253D4C').text(value,{paragraphGap:12});
  } else if(node.type==='bulletList'||node.type==='orderedList') {
    for(const [i,child] of (node.content??[]).entries()){
      const mark=node.type==='orderedList'?(i+1)+'. ':'• ';
      richLine(doc,child,{font:'Times-Roman',size:11.5,color:'#20252D',gap:5,indent:14,prefix:mark});
    }
    doc.moveDown(.4);
  } else if(node.type==='horizontalRule') {
    const y=doc.y+6;
    doc.strokeColor('#ccd7d5').moveTo(65,y).lineTo(530,y).stroke();doc.moveDown(1);
  } else {
    for(const child of node.content??[])writeBlocks(doc,child);
  }
}

/**
 * Generate a printable PDF for a verified immutable snapshot only.
 * Contents are private and never written to temporary/public files.
 */
export async function renderReadingPdf(bookTitle:string,chapters:ExportChapter[]):Promise<Uint8Array> {
  if(!chapters.length || chapters.length>500)throw new Error('EXPORT_EMPTY');
  verifyGlyphs(bookTitle);
  const doc=new PDFDocument({size:'A4',margin:65,bufferPages:false,
    info:{Title:bookTitle,Author:'BookStudio AI by DTSC',Subject:'Version du manuscrit'}});
  const chunks:Buffer[]=[];
  let bytes=0;
  const done=new Promise<Uint8Array>((resolve,reject)=>{
    doc.on('data',(chunk:Buffer)=>{
      bytes+=chunk.length;
      if(bytes>25*1024*1024) {reject(new Error('EXPORT_TOO_LARGE')); doc.destroy();}
      else chunks.push(Buffer.from(chunk));
    });
    doc.on('error',reject);
    doc.on('end',()=>resolve(new Uint8Array(Buffer.concat(chunks))));
  });
  try{
    doc.font('Helvetica-Bold').fontSize(27).fillColor('#142C39').text(bookTitle,{align:'center',paragraphGap:20});
    doc.font('Helvetica').fontSize(9).fillColor('#678079').text('BOOKSTUDIO AI BY DTSC · ÉDITION DE LECTURE',{align:'center'});
    doc.moveDown(3);
    for(let index=0;index<chapters.length;index++){
      const chapter=chapters[index];
      assertValidDocument(chapter.content);
      verifyGlyphs(chapter.title);
      if(index>0)doc.addPage();
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#142C39').text(chapter.title,{paragraphGap:16});
      for(const item of ((chapter.content as Node).content??[]))writeBlocks(doc,item);
    }
    doc.end();
    return await done;
  }catch(err){
    doc.destroy();
    // Avoid an unhandled rejection from PDFKit's async event if generation fails.
    done.catch(()=>undefined);
    throw err;
  }
}
