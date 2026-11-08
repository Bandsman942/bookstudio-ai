import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';
import {assertValidDocument} from '@bookstudio/domain';

export const FIND_MAX_QUERY_LENGTH=120;
export const FIND_MAX_REPLACEMENT_LENGTH=1000;
export const FIND_MAX_MATCHES=500;

export type ChapterTextMatch={from:number;to:number};
export type ChapterFindResult={matches:ChapterTextMatch[];limited:boolean};

/** Literal case-insensitive Unicode search in each *single text node*.
 * A formatted text boundary is never crossed for replacement: otherwise
 * the original link/italic/bold runs would be silently flattened. */
export function findChapterTextMatches(
  doc:ProseMirrorNode,query:string,caseSensitive=false,limit=FIND_MAX_MATCHES
):ChapterFindResult{
  if(query.length===0||!query.trim())return {matches:[],limited:false};
  if(query.length>FIND_MAX_QUERY_LENGTH||
     /[\u0000-\u001f\u007f]/.test(query)||
     !Number.isSafeInteger(limit)||limit<1||limit>FIND_MAX_MATCHES)
    throw new Error('FIND_QUERY_INVALID');
  const escaped=query.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
  const pattern=new RegExp(escaped,caseSensitive?'gu':'giu');
  const matches:ChapterTextMatch[]=[];
  let limited=false;
  doc.descendants((node,pos)=>{
    if(limited)return false;
    // ProseMirror's false skips ALL children. Descend through paragraph,
    // heading, list and quote blocks to inspect their text nodes.
    if(!node.isText||!node.text)return true;
    pattern.lastIndex=0;
    for(const match of node.text.matchAll(pattern)){
      if(matches.length>=limit){limited=true;break;}
      matches.push({from:pos+match.index,to:pos+match.index+match[0].length});
    }
    return false;
  });
  return {matches,limited};
}

export function validateChapterReplacement(value:string):void{
  // One replacement is *plain text*. Multiline edits should use the
  // editor to create proper paragraph blocks, not flatten the document.
  if(value.length>FIND_MAX_REPLACEMENT_LENGTH||
     /[\u0000-\u001f\u007f]/.test(value))
    throw new Error('REPLACE_VALUE_INVALID');
}

/** Mutate a candidate transaction but NEVER dispatch it here.
 * Callers must dispatch only after full validation; failure leaves the
 * live Tiptap document untouched. Descending ranges ensure stable offsets.
 * A single dispatched transaction = a single Undo step. */
export function applyChapterTextReplacements(
 tr:Transaction,matches:readonly ChapterTextMatch[],replacement:string
):Transaction{
 validateChapterReplacement(replacement);
 if(matches.length>FIND_MAX_MATCHES)
   throw new Error('REPLACE_TOO_MANY');
 for(let i=0;i<matches.length;i++){
   const item=matches[i];
   if(!Number.isSafeInteger(item.from)||!Number.isSafeInteger(item.to)||
      item.from<0||item.to<=item.from||
      (i>0&&item.from<matches[i-1].to))
     throw new Error('REPLACE_STALE_SELECTION');
 }
 for(let i=matches.length-1;i>=0;i--){
   tr.insertText(replacement,matches[i].from,matches[i].to);
 }
 try{assertValidDocument(tr.doc.toJSON());}
 catch(error){
   const message=error instanceof Error?error.message:'';
   if(message==='DOCUMENT_TOO_LARGE'||message==='DOCUMENT_TOO_COMPLEX')
     throw new Error('REPLACE_TOO_LARGE');
   throw new Error('REPLACE_DOCUMENT_INVALID');
 }
 return tr;
}
