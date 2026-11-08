import {assertValidDocument} from '@bookstudio/domain';
import {Buffer} from 'node:buffer';

export const BOOK_DUPLICATE_MAX_CHAPTERS=500;
export const BOOK_DUPLICATE_MAX_BYTES=20*1024*1024;
export type SourceChapter={id:string;title:string;position:number;revisionSeq:number};
export type SavedChapterRevision={chapterId:string;sequence:number;content:unknown;text:string;contentHash:string};
export type BookDuplicateChapter={
 sourceChapterId:string;title:string;position:number;content:Record<string,unknown>;text:string;contentHash:string
};

/** Safe, independent manuscript copy plan; no source, comment, snapshot, ACL or scan records. */
export function planBookDuplicate(chapters:readonly SourceChapter[],
 revisions:readonly SavedChapterRevision[]):BookDuplicateChapter[]{
 if(chapters.length>BOOK_DUPLICATE_MAX_CHAPTERS)
   throw new Error('BOOK_DUPLICATE_TOO_LARGE');
 const keys=new Map(revisions.map(rev=>[rev.chapterId+':'+rev.sequence,rev]));
 if(keys.size!==chapters.length||revisions.length!==chapters.length)
   throw new Error('BOOK_DUPLICATE_SOURCE_INVALID');
 const positions=new Set<number>(),ids=new Set<string>();
 let bytes=0;
 const result=chapters.map(chapter=>{
   if(ids.has(chapter.id)||positions.has(chapter.position)||
     !Number.isSafeInteger(chapter.position)||chapter.position<0||
     !Number.isSafeInteger(chapter.revisionSeq)||chapter.revisionSeq<0||
     !chapter.title.trim())
       throw new Error('BOOK_DUPLICATE_SOURCE_INVALID');
   ids.add(chapter.id);positions.add(chapter.position);
   const current=keys.get(chapter.id+':'+chapter.revisionSeq);
   if(!current||typeof current.text!=='string'||
     !/^[a-f0-9]{64}$/i.test(current.contentHash))
     throw new Error('BOOK_DUPLICATE_SOURCE_INVALID');
   try{assertValidDocument(current.content);}
   catch{throw new Error('BOOK_DUPLICATE_SOURCE_INVALID');}
   // Content hashes were computed before JSONB stored keys; preserve the
   // original immutable hash and JSON without lossy reserialization.
   bytes+=Buffer.byteLength(JSON.stringify(current.content),'utf8')+
     Buffer.byteLength(current.text,'utf8');
   if(bytes>BOOK_DUPLICATE_MAX_BYTES)throw new Error('BOOK_DUPLICATE_TOO_LARGE');
   return {sourceChapterId:chapter.id,title:chapter.title,
     position:chapter.position,content:current.content,
     text:current.text,contentHash:current.contentHash};
 });
 return result.sort((a,b)=>a.position-b.position||
   a.sourceChapterId.localeCompare(b.sourceChapterId));
}
