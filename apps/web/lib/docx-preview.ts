'use client';
import {unzipSync} from 'fflate';

const WORD_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MAX_ZIP_BYTES=20*1024*1024;
const MAX_UNCOMPRESSED_BYTES=64*1024*1024;
const MAX_DOC_XML_BYTES=8*1024*1024;
const MAX_REL_XML_BYTES=1024*1024;
const MAX_ENTRIES=1500;
const MAX_PREVIEW_PARAGRAPHS=200;
const MAX_PREVIEW_CHARS=100000;
const MAX_RATIO=400;

export type PreviewBlock={kind:'heading'|'paragraph';text:string;style:string};
export type DocxPreview={status:'PREVIEW_REVIEW_REQUIRED';blocks:PreviewBlock[];
  warnings:string[];truncated:boolean;verifiedFidelity:false;readyForPublication:false};
export class DocxPreviewError extends Error{
  constructor(public readonly code:string){super(code);this.name='DocxPreviewError';}
}
const fail=(code:string):never=>{throw new DocxPreviewError(code);};
type Entry={name:string;size:number;packed:number;method:number};

function readU16(view:DataView,offset:number){return view.getUint16(offset,true);}
function readU32(view:DataView,offset:number){return view.getUint32(offset,true);}
function decodeName(bytes:Uint8Array){
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  catch{return fail('DOCX_UNSAFE_ARCHIVE');}
}

/** Verify central ZIP directory budgets BEFORE any decompression. */
export function inspectDocxContainer(data:Uint8Array):Entry[]{
  if(data.byteLength<22||data.byteLength>MAX_ZIP_BYTES||data[0]!==0x50||
     data[1]!==0x4b||data[2]!==0x03||data[3]!==0x04)fail('DOCX_INVALID_CONTAINER');
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  let eocd=-1;
  for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){
    if(readU32(view,i)===0x06054b50&&i+22+readU16(view,i+20)===data.length){eocd=i;break;}
  }
  if(eocd<0)fail('DOCX_INVALID_CONTAINER');
  const count=readU16(view,eocd+10),cdSize=readU32(view,eocd+12),cdStart=readU32(view,eocd+16);
  if(readU16(view,eocd+4)!==0||readU16(view,eocd+6)!==0||
     readU16(view,eocd+8)!==count||!count||count>MAX_ENTRIES||
     count===0xffff||cdSize===0xffffffff||cdStart===0xffffffff||
     cdStart+cdSize>eocd)fail('DOCX_ARCHIVE_LIMIT');
  let pos=cdStart,total=0;
  const entries:Entry[]=[];const seen=new Set<string>();
  for(let i=0;i<count;i++){
    if(pos+46>cdStart+cdSize||readU32(view,pos)!==0x02014b50)fail('DOCX_INVALID_CONTAINER');
    const flags=readU16(view,pos+8),method=readU16(view,pos+10);
    const packed=readU32(view,pos+20),size=readU32(view,pos+24);
    const nlen=readU16(view,pos+28),elen=readU16(view,pos+30),clen=readU16(view,pos+32);
    const localOffset=readU32(view,pos+42),external=readU32(view,pos+38);
    const end=pos+46+nlen+elen+clen;
    if(end>cdStart+cdSize||!nlen||localOffset>=cdStart)fail('DOCX_INVALID_CONTAINER');
    const name=decodeName(data.subarray(pos+46,pos+46+nlen));
    const lower=name.toLowerCase();
    if(!name||name.startsWith('/')||name.includes('\\')||name.includes(':')||
       name.includes('\0')||name.split('/').includes('..')||name.split('/').includes('.')||
       seen.has(lower)||(!name.endsWith('/')&&/\/$/.test(name))||
       (external>>>16&0xf000)===0xa000)fail('DOCX_UNSAFE_ARCHIVE');
    seen.add(lower);
    if(flags&1||![0,8].includes(method))fail('DOCX_UNSAFE_ARCHIVE');
    if(packed===0&&size>0 || packed>0&&size/packed>MAX_RATIO)fail('DOCX_ARCHIVE_LIMIT');
    total+=size;
    if(total>MAX_UNCOMPRESSED_BYTES)fail('DOCX_ARCHIVE_LIMIT');
    if((name.endsWith('.xml')||name.endsWith('.rels'))&&size>MAX_DOC_XML_BYTES)
      fail('DOCX_ARCHIVE_LIMIT');
    if(lower.includes('vbaproject')||/\.(exe|dll|js|vbs|ps1|bin)$/.test(lower))
      fail('DOCX_ACTIVE_CONTENT');
    entries.push({name,size,packed,method});pos=end;
  }
  if(pos!==cdStart+cdSize)fail('DOCX_INVALID_CONTAINER');
  const names=new Set(entries.map(e=>e.name));
  if(!names.has('word/document.xml')||!names.has('[Content_Types].xml'))fail('DOCX_NOT_WORD');
  if(entries.find(e=>e.name==='word/document.xml')!.size>MAX_DOC_XML_BYTES)fail('DOCX_ARCHIVE_LIMIT');
  if((entries.find(e=>e.name==='word/_rels/document.xml.rels')?.size??0)>MAX_REL_XML_BYTES)
    fail('DOCX_ARCHIVE_LIMIT');
  return entries;
}
function safeXml(bytes:Uint8Array){
  if(bytes.length>MAX_DOC_XML_BYTES)fail('DOCX_ARCHIVE_LIMIT');
  let xml:string;
  try{xml=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  catch{return fail('DOCX_INVALID_XML');}
  if(/<!\s*(DOCTYPE|ENTITY)/i.test(xml))fail('DOCX_UNSAFE_XML');
  if(typeof DOMParser==='undefined')fail('DOCX_BROWSER_ONLY');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||
     doc.getElementsByTagNameNS('*','parsererror').length)fail('DOCX_INVALID_XML');
  return doc;
}
function getWordChildren(element:Element,tag:string){
  return Array.from(element.getElementsByTagNameNS(WORD_NS,tag));
}
function paragraphText(p:Element):string{
  return getWordChildren(p,'t').map(n=>n.textContent||'').join('').slice(0,10000);
}
/** This is a readable advisory preview, NOT a fidelity-verified Word conversion. */
export function previewDocx(data:Uint8Array):DocxPreview{
  const entries=inspectDocxContainer(data),allowed=new Set([
    'word/document.xml','word/_rels/document.xml.rels','[Content_Types].xml'
  ]);
  let files:Record<string,Uint8Array>;
  try{files=unzipSync(data,{filter:entry=>allowed.has(entry.name)&&
    entry.originalSize<=MAX_DOC_XML_BYTES});}
  catch{return fail('DOCX_CORRUPTED');}
  if(!files['word/document.xml']||!files['[Content_Types].xml'])fail('DOCX_NOT_WORD');
  const types=safeXml(files['[Content_Types].xml']);
  if(types.documentElement.localName!=='Types')fail('DOCX_NOT_WORD');
  const typeText=new TextDecoder().decode(files['[Content_Types].xml']);
  if(/macroEnabled|vbaproject/i.test(typeText))fail('DOCX_ACTIVE_CONTENT');
  const doc=safeXml(files['word/document.xml']);
  if(doc.documentElement.localName!=='document'||doc.documentElement.namespaceURI!==WORD_NS)
    fail('DOCX_NOT_WORD');
  const body=getWordChildren(doc.documentElement,'body')[0];
  if(!body)fail('DOCX_NOT_WORD');
  const warnings=new Set<string>();
  if(entries.some(e=>e.name.startsWith('word/media/')))warnings.add('IMAGES_PRESENT');
  if(entries.some(e=>e.name==='word/footnotes.xml'||e.name==='word/endnotes.xml'))
    warnings.add('NOTES_PRESENT');
  if(getWordChildren(body,'tbl').length)warnings.add('TABLES_NOT_RENDERED');
  if(getWordChildren(body,'ins').length||getWordChildren(body,'del').length)
    warnings.add('TRACKED_CHANGES_PRESENT');
  if(getWordChildren(body,'fldChar').length)warnings.add('FIELDS_NOT_EVALUATED');
  if(getWordChildren(body,'drawing').length)warnings.add('DRAWINGS_NOT_RENDERED');
  if(files['word/_rels/document.xml.rels']){
    const rels=safeXml(files['word/_rels/document.xml.rels']);
    if(Array.from(rels.getElementsByTagName('*')).some(el=>
      el.getAttribute('TargetMode')?.toLowerCase()==='external'))warnings.add('EXTERNAL_LINKS_PRESENT');
  }
  const blocks:PreviewBlock[]=[];let totalChars=0,truncated=false;
  for(const child of Array.from(body.children)){
    if(child.namespaceURI!==WORD_NS||child.localName!=='p')continue;
    if(blocks.length>=MAX_PREVIEW_PARAGRAPHS||totalChars>=MAX_PREVIEW_CHARS){
      truncated=true;break;
    }
    const text=paragraphText(child);
    if(!text.trim())continue;
    totalChars+=text.length;
    const style=getWordChildren(child,'pStyle')[0]?.getAttributeNS(WORD_NS,'val')||'';
    const kind=/^(heading|titre)[\s_-]*[1-9]/i.test(style)?'heading':'paragraph';
    blocks.push({kind,text,style:style.slice(0,70)});
  }
  if(truncated)warnings.add('PREVIEW_TRUNCATED');
  if(!blocks.length)warnings.add('NO_SIMPLE_TEXT_FOUND');
  return {status:'PREVIEW_REVIEW_REQUIRED',blocks,warnings:[...warnings].sort(),
    truncated,verifiedFidelity:false,readyForPublication:false};
}
