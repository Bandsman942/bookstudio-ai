import PDFDocument from 'pdfkit';
import {assertValidDocument} from '@bookstudio/domain';
import type {ExportChapter} from './docx-export';

type Node = {type?:string;text?:string;attrs?:{level?:number};content?:Node[]};
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
function writeBlocks(doc:PDFKit.PDFDocument,node:Node) {
  if(node.type==='paragraph'){
    const value=plain(node);verifyGlyphs(value);
    doc.font('Times-Roman').fontSize(11.5).fillColor('#20252D').text(value||' ',{lineGap:4,paragraphGap:10});
  } else if(node.type==='heading') {
    const level=Math.max(1,Math.min(3,Number(node.attrs?.level??1)));
    const value=plain(node);verifyGlyphs(value);
    const size=level===1?20:level===2?15:13;
    doc.moveDown(.55).font('Helvetica-Bold').fontSize(size).fillColor('#182B39').text(value,{paragraphGap:8,keepTogether:true});
  } else if(node.type==='blockquote'){
    const value=plain(node);verifyGlyphs(value);
    doc.font('Times-Italic').fontSize(11).fillColor('#596C73').text('« '+value+' »',{indent:18,paragraphGap:10});
  } else if(node.type==='codeBlock'){
    const value=plain(node);verifyGlyphs(value);
    doc.font('Courier').fontSize(9).fillColor('#253D4C').text(value,{paragraphGap:12});
  } else if(node.type==='bulletList'||node.type==='orderedList') {
    for(const [i,child] of (node.content??[]).entries()){
      const value=plain(child);verifyGlyphs(value);
      const mark=node.type==='orderedList'?(i+1)+'. ':'• ';
      doc.font('Times-Roman').fontSize(11.5).fillColor('#20252D').text(mark+value,{indent:14,paragraphGap:5});
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
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#142C39').text(chapter.title,{paragraphGap:16,keepTogether:true});
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
