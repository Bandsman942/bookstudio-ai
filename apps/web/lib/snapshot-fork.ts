import type {SnapshotManifest} from './snapshots';
import {Buffer} from 'node:buffer';

// An immutable snapshot refers to historical revision rows, not to the
// chapter's current revision pointer. Never copy latest content by accident.
export type SnapshotRevisionSource={
 chapterId:string;sequence:number;content:unknown;text:string;contentHash:string;
 chapter:{manuscriptId:string};
};
export type SnapshotForkChapter={
 sourceChapterId:string;title:string;position:number;partId:string|null;
 content:unknown;text:string;contentHash:string;
};
export const SNAPSHOT_FORK_MAX_CHAPTERS=500;
export const SNAPSHOT_FORK_MAX_BYTES=20*1024*1024;

export function planSnapshotFork(manifest:SnapshotManifest,sourceManuscriptId:string,
 revisions:SnapshotRevisionSource[]):SnapshotForkChapter[]{
 if(!manifest.chapters.length||manifest.chapters.length>SNAPSHOT_FORK_MAX_CHAPTERS)
   throw new Error('SNAPSHOT_COPY_TOO_LARGE');
 const keys=new Map(revisions.map(rev=>[rev.chapterId+':'+rev.sequence,rev]));
 if(keys.size!==manifest.chapters.length||revisions.length!==manifest.chapters.length)
   throw new Error('SNAPSHOT_CORRUPT');
 let bytes=0;
 const positions=new Set<number>(),ids=new Set<string>();
 const result:SnapshotForkChapter[]=manifest.chapters.map(item=>{
   if(positions.has(item.position)||ids.has(item.chapterId)||!item.title.trim())
     throw new Error('SNAPSHOT_CORRUPT');
   positions.add(item.position);ids.add(item.chapterId);
   const rev=keys.get(item.chapterId+':'+item.revisionSeq);
   if(!rev||rev.chapter.manuscriptId!==sourceManuscriptId||
      rev.contentHash!==item.contentHash||typeof rev.text!=='string'||
      !rev.content||typeof rev.content!=='object'||Array.isArray(rev.content))
     throw new Error('SNAPSHOT_CORRUPT');
   // Legacy revisions were hashed BEFORE JSONB persistence: don't recompute
   // the byte hash from JSONB's reordered object keys. Compare the immutable
   // revision's stored SHA256 with the signed snapshot manifest instead.
   bytes+=Buffer.byteLength(JSON.stringify(rev.content),'utf8')+
     Buffer.byteLength(rev.text,'utf8');
   if(bytes>SNAPSHOT_FORK_MAX_BYTES)throw new Error('SNAPSHOT_COPY_TOO_LARGE');
   return {sourceChapterId:item.chapterId,title:item.title,position:item.position,
     partId:'partId' in item&&typeof item.partId==='string'?item.partId:null,
     content:rev.content,text:rev.text,contentHash:rev.contentHash};
 });
 return result.sort((a,b)=>a.position-b.position||
   a.sourceChapterId.localeCompare(b.sourceChapterId));
}
