import { createHash } from 'node:crypto';

export type SnapshotChapter = {
  chapterId: string;
  revisionSeq: number;
  contentHash: string;
  title: string;
  position: number;
};
export type SnapshotManifest = {
  schema: 'bookstudio.snapshot.v1';
  editionId: string;
  chapters: SnapshotChapter[];
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
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
  if (value.schema !== 'bookstudio.snapshot.v1' || typeof value.editionId !== 'string' ||
      !uuid.test(value.editionId) || !Array.isArray(value.chapters) ||
      value.chapters.length < 1 || value.chapters.length > 500) throw new Error('SNAPSHOT_INVALID');

  const ids = new Set<string>();
  const chapters: SnapshotChapter[] = value.chapters.map(c => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('SNAPSHOT_INVALID');
    const item = c as Record<string, unknown>;
    if (typeof item.chapterId !== 'string' || !uuid.test(item.chapterId) ||
        !Number.isSafeInteger(item.revisionSeq) || Number(item.revisionSeq) < 0 ||
        typeof item.contentHash !== 'string' || !sha.test(item.contentHash) ||
        typeof item.title !== 'string' || item.title.length > 180 ||
        !Number.isSafeInteger(item.position) || Number(item.position) < 0) throw new Error('SNAPSHOT_INVALID');
    if (ids.has(item.chapterId)) throw new Error('SNAPSHOT_DUPLICATE_CHAPTER');
    ids.add(item.chapterId);
    return {chapterId:item.chapterId,revisionSeq:Number(item.revisionSeq),contentHash:item.contentHash,title:item.title,position:Number(item.position)};
  });
  return { schema:'bookstudio.snapshot.v1', editionId:value.editionId, chapters };
}
