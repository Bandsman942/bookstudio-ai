import {assertValidDocument,normalizeTitle,plainText} from '@bookstudio/domain';
import {isStoredName} from './supabase-storage';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type ReviewedBlock={kind:'heading'|'paragraph';text:string};
export type ReviewedDocxImport={
  title:string;sourceName:string;operationId:string;
  content:{type:'doc';content:Array<Record<string,unknown>>};text:string;
};
export class ReviewedImportError extends Error {
 readonly code:string;
 constructor(code:string){super(code);this.code=code;this.name='ReviewedImportError';}
}
const reject=(code:string):never=>{throw new ReviewedImportError(code);};

/** Only explicitly reviewed text nodes are converted to safe Tiptap JSON. */
export function prepareReviewedDocxImport(value:unknown):ReviewedDocxImport{
  if(!value||typeof value!=='object'||Array.isArray(value))reject('DOCX_REVIEW_INVALID');
  const x=value as Record<string,unknown>;
  if(x.confirm!=='IMPORT_REVIEWED_DOCX'||x.acknowledged!==true)reject('DOCX_REVIEW_REQUIRED');
  if(x.truncated!==false)reject('DOCX_PREVIEW_TRUNCATED');
  if(typeof x.sourceName!=='string'||!isStoredName(x.sourceName)||!x.sourceName.toLowerCase().endsWith('.docx'))
    reject('DOCX_SOURCE_INVALID');
  if(typeof x.operationId!=='string'||!UUID.test(x.operationId))reject('DOCX_OPERATION_INVALID');
  let title:string;
  try{title=normalizeTitle(x.title);}catch{return reject('TITLE_INVALID');}
  if(!Array.isArray(x.blocks)||!x.blocks.length||x.blocks.length>200)reject('DOCX_BLOCKS_INVALID');
  let chars=0;
  const nodes:Array<Record<string,unknown>>=[];
  for(const b of x.blocks){
    if(!b||typeof b!=='object'||Array.isArray(b))reject('DOCX_BLOCKS_INVALID');
    const item=b as Record<string,unknown>;
    if(!['heading','paragraph'].includes(String(item.kind))||
       typeof item.text!=='string'||item.text.length>10000||!item.text.trim())
      reject('DOCX_BLOCKS_INVALID');
    chars+=item.text.length;
    if(chars>100000)reject('DOCX_TEXT_TOO_LARGE');
    const heading=item.kind==='heading';
    nodes.push({
      type:heading?'heading':'paragraph',
      ...(heading?{attrs:{level:2}}:{}),
      content:[{type:'text',text:item.text}]
    });
  }
  const content={type:'doc' as const,content:nodes};
  try{assertValidDocument(content);}catch{return reject('DOCX_TEXT_TOO_LARGE');}
  const text=plainText(content);
  if(!text.trim())reject('DOCX_BLOCKS_INVALID');
  return {title,sourceName:x.sourceName,operationId:x.operationId,content,text};
}
