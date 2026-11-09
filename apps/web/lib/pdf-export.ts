import PDFDocument from 'pdfkit';
import {assertValidDocument,safeExternalHref} from '@bookstudio/domain';
import type {ExportChapter} from './docx-export';
import {registerUnicodeFonts,unicodeRuns,UnsupportedPdfGlyph,type FontStyle} from './pdf-unicode-fonts.ts';
export {UnsupportedPdfGlyph} from './pdf-unicode-fonts.ts';

type Node = {type?:string;text?:string;attrs?:{level?:number};
  marks?:Array<{type?:string;attrs?:{href?:string}}> ;content?:Node[]};
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
  font:FontStyle;size:number;color:string;gap:number;indent?:number;prefix?:string
},fontCache:Map<string,string>){
  const spans=segments(node).filter(span=>span.text.length>0);
  if(opts.prefix)spans.unshift({text:opts.prefix,marks:[]});
  if(!spans.length)spans.push({text:' ',marks:[]});
  const fragments:{text:string;font:string;href:string|null;flags:Set<string>}[]=[];
  for(const span of spans){
    const flags=new Set((span.marks??[]).map(mark=>mark.type??''));
    const raw=span.marks?.find(mark=>mark.type==='link')?.attrs?.href;
    const href=raw?safeExternalHref(raw):null;
    const style:FontStyle=flags.has('bold')&&flags.has('italic')?'boldItalic':
      flags.has('bold')?'bold':flags.has('italic')?'italic':opts.font;
    for(const run of unicodeRuns(doc,span.text,style,fontCache as Map<string,any>))
      fragments.push({text:run.text,font:run.font,href,flags});
  }
  for(let i=0;i<fragments.length;i++){
    const span=fragments[i];
    doc.font(span.font).fontSize(opts.size).fillColor(span.href?'#156AB6':opts.color);
    doc.text(span.text,{
      continued:i<fragments.length-1,
      lineGap:3,
      paragraphGap:i===fragments.length-1?opts.gap:0,
      indent:i===0?(opts.indent??0):0,
      underline:span.flags.has('underline')||Boolean(span.href),
      strike:span.flags.has('strike'),
      link:span.href
    } as PDFKit.Mixins.TextOptions);
  }
}

function writeBlocks(doc:PDFKit.PDFDocument,node:Node,fontCache:Map<string,string>) {
  if(node.type==='paragraph'){
    richLine(doc,node,{font:'regular',size:11.5,color:'#20252D',gap:10},fontCache);
  } else if(node.type==='heading') {
    const level=Math.max(1,Math.min(3,Number(node.attrs?.level??1)));
    const size=level===1?20:level===2?15:13;
    doc.moveDown(.55);
    richLine(doc,node,{font:'bold',size,color:'#182B39',gap:8},fontCache);
  } else if(node.type==='blockquote'){
    richLine(doc,node,{font:'italic',size:11,color:'#596C73',gap:10,indent:18},fontCache);
  } else if(node.type==='codeBlock'){
    richLine(doc,node,{font:'regular',size:9,color:'#253D4C',gap:12},fontCache);
  } else if(node.type==='bulletList'||node.type==='orderedList') {
    for(const [i,child] of (node.content??[]).entries()){
      const mark=node.type==='orderedList'?(i+1)+'. ':'• ';
      richLine(doc,child,{font:'regular',size:11.5,color:'#20252D',gap:5,indent:14,prefix:mark},fontCache);
    }
    doc.moveDown(.4);
  } else if(node.type==='horizontalRule') {
    const y=doc.y+6;
    doc.strokeColor('#ccd7d5').moveTo(65,y).lineTo(530,y).stroke();doc.moveDown(1);
  } else {
    for(const child of node.content??[])writeBlocks(doc,child,fontCache);
  }
}

/**
 * Generate a printable PDF for a verified immutable snapshot only.
 * Contents are private and never written to temporary/public files.
 */
export async function renderReadingPdf(bookTitle:string,chapters:ExportChapter[]):Promise<Uint8Array> {
  if(!chapters.length || chapters.length>500)throw new Error('EXPORT_EMPTY');
  const doc=new PDFDocument({size:'A4',margin:65,bufferPages:false,
    info:{Title:bookTitle,Author:'BookStudio AI by DTSC',Subject:'Version du manuscrit'}});
  registerUnicodeFonts(doc);
  const fontCache=new Map<string,string>();
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
    richLine(doc,{type:'text',text:bookTitle},{font:'bold',size:27,color:'#142C39',gap:20},fontCache);
    richLine(doc,{type:'text',text:'BOOKSTUDIO AI BY DTSC · ÉDITION DE LECTURE'},{font:'regular',size:9,color:'#678079',gap:10},fontCache);
    const hasParts=chapters.some(chapter=>Boolean(chapter.partTitle));
    if(hasParts){
      doc.moveDown(2);
      richLine(doc,{type:'text',text:'TABLE DES MATIÈRES'},
        {font:'bold',size:17,color:'#142C39',gap:16},fontCache);
      // Intentionally omit page numbers: PDFKit paginates chapters and long
      // contents dynamically. Never present guessed page references as fact.
      for(const chapter of chapters){
        if(chapter.partTitle)richLine(doc,{type:'text',text:chapter.partTitle},
          {font:'bold',size:12,color:'#2C7E73',gap:8},fontCache);
        richLine(doc,{type:'text',text:chapter.title},
          {font:'regular',size:10.5,color:'#263846',gap:7,
            indent:chapter.withinPart?18:0},fontCache);
      }
      doc.addPage();
    }else doc.moveDown(3);
    for(let index=0;index<chapters.length;index++){
      const chapter=chapters[index];
      assertValidDocument(chapter.content);
      if(index>0)doc.addPage();
      try{
        if(chapter.partTitle)richLine(doc,{type:'text',text:chapter.partTitle},
          {font:'bold',size:21,color:'#2C7E73',gap:13},fontCache);
        richLine(doc,{type:'text',text:chapter.title},{font:'bold',size:18,color:'#142C39',gap:16},fontCache);
        for(const item of ((chapter.content as Node).content??[]))writeBlocks(doc,item,fontCache);
      }catch(error){
        if(error instanceof UnsupportedPdfGlyph)error.chapterNumber=index+1;
        throw error;
      }
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
