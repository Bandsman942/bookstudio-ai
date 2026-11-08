import {Buffer} from 'node:buffer';
import {assertValidDocument} from '@bookstudio/domain';

export const CHAPTER_COPY_MAX_ACTIVE_CHAPTERS=500;
export const CHAPTER_COPY_MAX_BYTES=20*1024*1024;
export type SavedChapterCopy={sequence:number;content:unknown;text:string;contentHash:string};
export type PlannedChapterCopy={content:Record<string,unknown>;text:string;contentHash:string};

/** Validates one immutable saved revision; never recompute old JSONB hashes
 * because earlier content was hashed before JSONB key normalization. */
export function planChapterCopy(source:SavedChapterCopy,expectedRevision:number):PlannedChapterCopy{
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||
    source.sequence!==expectedRevision||
    typeof source.text!=='string'||!/^[a-f0-9]{64}$/i.test(source.contentHash))
    throw new Error('CHAPTER_COPY_SOURCE_INVALID');
 try{assertValidDocument(source.content);}
 catch{throw new Error('CHAPTER_COPY_SOURCE_INVALID');}
 const bytes=Buffer.byteLength(JSON.stringify(source.content),'utf8')+
   Buffer.byteLength(source.text,'utf8');
 if(bytes>CHAPTER_COPY_MAX_BYTES)throw new Error('CHAPTER_COPY_TOO_LARGE');
 return {content:source.content,text:source.text,contentHash:source.contentHash};
}
export function nextChapterPosition(max:number|null):number{
 const next=(max??-1)+1;
 if(!Number.isSafeInteger(next)||next<0||next>2147483647)
   throw new Error('CHAPTER_COPY_TOO_LARGE');
 return next;
}
