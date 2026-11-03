import {assertValidDocument,normalizeTitle,plainText} from '@bookstudio/domain';
// Self-contained validation also runs in Node's strip-types unit runner.
const STORED=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-z0-9][a-z0-9._-]{0,95}$/i;
const isStoredName=(name:string)=>STORED.test(name)&&!name.includes('..');

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
  const sourceName=x.sourceName;
  if(typeof sourceName!=='string'||!isStoredName(sourceName)||!sourceName.toLowerCase().endsWith('.docx'))
    reject('DOCX_SOURCE_INVALID');
  const operationId=x.operationId;
  if(typeof operationId!=='string'||!UUID.test(operationId))reject('DOCX_OPERATION_INVALID');
  let title:string;
  try{title=normalizeTitle(x.title);}catch{return reject('TITLE_INVALID');}
  const blocks=x.blocks;
  if(!Array.isArray(blocks)||!blocks.length||blocks.length>200)reject('DOCX_BLOCKS_INVALID');
  let chars=0;
  const nodes:Array<Record<string,unknown>>=[];
  for(const b of blocks as unknown[]){
    if(!b||typeof b!=='object'||Array.isArray(b))reject('DOCX_BLOCKS_INVALID');
    const item=b as Record<string,unknown>;
    const rawText=item.text;
    if(!['heading','paragraph'].includes(String(item.kind))||
       typeof rawText!=='string'||rawText.length>10000||!rawText.trim())
      reject('DOCX_BLOCKS_INVALID');
    chars+=rawText.length;
    if(chars>100000)reject('DOCX_TEXT_TOO_LARGE');
    const heading=item.kind==='heading';
    nodes.push({
      type:heading?'heading':'paragraph',
      ...(heading?{attrs:{level:2}}:{}),
      content:[{type:'text',text:rawText}]
    });
  }
  const content={type:'doc' as const,content:nodes};
  try{assertValidDocument(content);}catch{return reject('DOCX_TEXT_TOO_LARGE');}
  const text=plainText(content);
  if(!text.trim())reject('DOCX_BLOCKS_INVALID');
  return {title,sourceName:sourceName as string,operationId:operationId as string,content,text};
}
