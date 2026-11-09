import { createHash } from 'node:crypto';

export type SnapshotChapter = {
  chapterId: string;
  revisionSeq: number;
  contentHash: string;
  title: string;
  position: number;
};
export type SnapshotManifestV1 = {
  schema: 'bookstudio.snapshot.v1';
  editionId: string;
  chapters: SnapshotChapter[];
};
export type SnapshotPart = { id:string; title:string };
export type SnapshotChapterV2 = SnapshotChapter & {partId:string|null};
export type SnapshotManifestV2 = {
  schema:'bookstudio.snapshot.v2';
  editionId:string;
  parts:SnapshotPart[];
  chapters:SnapshotChapterV2[];
};
export type SnapshotManifest = SnapshotManifestV1|SnapshotManifestV2;

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('SNAPSHOT_INVALID');
    return encoded;
  }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).sort().map(key => JSON.stringify(key) + ':' + canonical(obj[key])).join(',') + '}';
}

export function manifestHash(manifest: SnapshotManifest): string {
  return createHash('sha256').update(canonical(manifest)).digest('hex');
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = /^[0-9a-f]{64}$/;

export function parseSnapshotManifest(raw: unknown): SnapshotManifest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('SNAPSHOT_INVALID');
  const value = raw as Record<string, unknown>;
  if ((value.schema !== 'bookstudio.snapshot.v1' && value.schema !== 'bookstudio.snapshot.v2') ||
      typeof value.editionId !== 'string' ||
      !uuid.test(value.editionId) || !Array.isArray(value.chapters) ||
      value.chapters.length < 1 || value.chapters.length > 500) throw new Error('SNAPSHOT_INVALID');

  const isV2=value.schema==='bookstudio.snapshot.v2';
  const parts:SnapshotPart[]=[];
  const partIds=new Set<string>();
  if(isV2){
    if(!Array.isArray(value.parts)||value.parts.length>500)throw new Error('SNAPSHOT_INVALID');
    for(const row of value.parts){
      if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('SNAPSHOT_INVALID');
      const part=row as Record<string,unknown>;
      if(typeof part.id!=='string'||!uuid.test(part.id)||partIds.has(part.id)||
        typeof part.title!=='string'||!part.title.trim()||part.title.length>180)
        throw new Error('SNAPSHOT_INVALID');
      partIds.add(part.id);
      parts.push({id:part.id,title:part.title});
    }
  }
  const ids = new Set<string>();
  const positions=new Set<number>();
  const chapters: SnapshotChapterV2[] = value.chapters.map(c => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('SNAPSHOT_INVALID');
    const item = c as Record<string, unknown>;
    if (typeof item.chapterId !== 'string' || !uuid.test(item.chapterId) ||
        !Number.isSafeInteger(item.revisionSeq) || Number(item.revisionSeq) < 0 ||
        typeof item.contentHash !== 'string' || !sha.test(item.contentHash) ||
        typeof item.title !== 'string' || item.title.length > 180 ||
        !Number.isSafeInteger(item.position) || Number(item.position) < 0) throw new Error('SNAPSHOT_INVALID');
    if (ids.has(item.chapterId)) throw new Error('SNAPSHOT_DUPLICATE_CHAPTER');
    ids.add(item.chapterId);
    if(isV2){
      if(positions.has(Number(item.position))||
        !(item.partId===null||typeof item.partId==='string'&&partIds.has(item.partId)))
        throw new Error('SNAPSHOT_INVALID');
      positions.add(Number(item.position));
    }
    return {chapterId:item.chapterId,revisionSeq:Number(item.revisionSeq),contentHash:item.contentHash,title:item.title,position:Number(item.position),partId:isV2?item.partId as string|null:null};
  });
  if(isV2){
    const closed=new Set<string>();
    let current:string|null=null;
    for(const chapter of [...chapters].sort((a,b)=>a.position-b.position)){
      if(chapter.partId===current)continue;
      if(current)closed.add(current);
      current=chapter.partId;
      if(current&&closed.has(current))throw new Error('SNAPSHOT_INVALID');
    }
    return {schema:'bookstudio.snapshot.v2',editionId:value.editionId,parts,chapters};
  }
  // v1 reserialization MUST stay byte-for-byte canonical-compatible with historical snapshots.
  return {schema:'bookstudio.snapshot.v1',editionId:value.editionId,
    chapters:chapters.map(({partId:_,...chapter})=>chapter)};
}
