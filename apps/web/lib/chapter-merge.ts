import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {assertValidDocument,plainText,MAX_CHAPTER_BYTES} from '@bookstudio/domain';
import {nextChapterPosition,CHAPTER_COPY_MAX_ACTIVE_CHAPTERS} from './chapter-copy.ts';

export const CHAPTER_MERGE_MAX_ACTIVE_CHAPTERS=CHAPTER_COPY_MAX_ACTIVE_CHAPTERS;
export const CHAPTER_MERGE_MAX_BYTES=MAX_CHAPTER_BYTES; // editor's actual max: 2 MiB

export type SavedMergeRevision={
 sequence:number;content:unknown;text:string;contentHash:string
};
export type ChapterMergePlan={
 content:{type:'doc';content:unknown[]};
 text:string;contentHash:string;blockCount:number;byteCount:number
};

/**
 * Non-destructive concatenation of the exact ROOT ProseMirror blocks in the
 * explicitly selected order. No HTML, no markdown, no AI rewriting or text
 * splitting. Marks and attributes are retained without interpretation.
 * A merge too large for the editor is REFUSED without truncation.
 */
export function planChapterMerge(first:SavedMergeRevision,second:SavedMergeRevision,
 firstSequence:number,secondSequence:number):ChapterMergePlan{
 for(const [revision,sequence] of [[first,firstSequence],[second,secondSequence]] as const){
   if(!Number.isSafeInteger(sequence)||sequence<0||revision.sequence!==sequence||
      typeof revision.text!=='string'||!/^[0-9a-f]{64}$/i.test(revision.contentHash))
     throw new Error('CHAPTER_MERGE_SOURCE_INVALID');
   try{assertValidDocument(revision.content);}
   catch{throw new Error('CHAPTER_MERGE_SOURCE_INVALID');}
 }
 const a=first.content as {type:'doc';content:unknown[]};
 const b=second.content as {type:'doc';content:unknown[]};
 // JSONB data from the source documents are preserved, with zero extra
 // separator paragraphs. The author may add section headings after review.
 const content:{type:'doc';content:unknown[]}={
   type:'doc',content:[...a.content,...b.content]
 };
 const raw=JSON.stringify(content);
 const byteCount=Buffer.byteLength(raw,'utf8');
 if(byteCount>CHAPTER_MERGE_MAX_BYTES)
   throw new Error('CHAPTER_MERGE_TOO_LARGE');
 try{assertValidDocument(content);}
 catch(error){
   const message=error instanceof Error?error.message:'';
   if(message==='DOCUMENT_TOO_LARGE'||message==='DOCUMENT_TOO_COMPLEX')
     throw new Error('CHAPTER_MERGE_TOO_LARGE');
   throw new Error('CHAPTER_MERGE_SOURCE_INVALID');
 }
 const text=plainText(content);
 return {
   content,text,contentHash:createHash('sha256').update(raw).digest('hex'),
   blockCount:content.content.length,byteCount
 };
}
export {nextChapterPosition};
