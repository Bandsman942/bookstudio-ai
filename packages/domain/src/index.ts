/** Core editorial invariants, safe for the browser. */
export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'REVIEWER' | 'VIEWER';
export type BookStatus = 'DRAFT' | 'WRITING' | 'REVIEW' | 'APPROVED' | 'PRODUCTION' | 'PUBLISHED' | 'ARCHIVED';
export const MAX_CHAPTER_BYTES = 2 * 1024 * 1024;
export const MAX_BOOK_TITLE = 180;
const rights: Record<WorkspaceRole, readonly string[]> = {
  OWNER: ['book:read', 'book:write', 'chapter:read', 'chapter:write', 'version:create', 'team:manage'],
  EDITOR: ['book:read', 'book:write', 'chapter:read', 'chapter:write', 'version:create'],
  REVIEWER: ['book:read', 'chapter:read', 'comment:write'],
  VIEWER: ['book:read', 'chapter:read'],
};
export function may(role: WorkspaceRole | null | undefined, action: string): boolean {
  return role != null && (rights[role]?.includes(action) ?? false);
}
export function normalizeTitle(value: unknown): string {
  if (typeof value !== 'string') throw new Error('TITLE_REQUIRED');
  const title = value.trim().replace(/\s+/g, ' ');
  if (title.length < 2 || title.length > MAX_BOOK_TITLE) throw new Error('TITLE_INVALID');
  return title;
}
/** URL policy shared by browser UI and server-side document validation. */
export function normalizeEditorHref(value:unknown):string|null {
  if(typeof value!=='string'||value.length>2048)return null;
  const href=value.trim();
  if(!href)return null;
  try{
    const url=new URL(href);
    if(!['https:','http:','mailto:'].includes(url.protocol))return null;
    if(url.protocol==='mailto:'&&!url.pathname.includes('@'))return null;
    if((url.protocol==='http:'||url.protocol==='https:')&&(!url.hostname||url.username||url.password))return null;
    return url.toString();
  }catch{return null;}
}
export function assertValidDocument(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('DOCUMENT_INVALID');
  const doc = value as Record<string, unknown>;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) throw new Error('DOCUMENT_INVALID');
  const json = JSON.stringify(value);
  if (new TextEncoder().encode(json).length > MAX_CHAPTER_BYTES) throw new Error('DOCUMENT_TOO_LARGE');
  let nodes = 0;
  function visit(n: unknown, depth: number) {
    if (depth > 25 || ++nodes > 20000) throw new Error('DOCUMENT_TOO_COMPLEX');
    if (typeof n !== 'object' || n === null || Array.isArray(n)) throw new Error('DOCUMENT_INVALID');
    const item = n as Record<string, unknown>;
    const allowed = new Set(['doc','paragraph','text','heading','bulletList','orderedList','listItem','blockquote','codeBlock','hardBreak','horizontalRule']);
    if (typeof item.type !== 'string' || !allowed.has(item.type)) throw new Error('DOCUMENT_UNSUPPORTED_NODE');
    if (item.text !== undefined && (item.type !== 'text' || typeof item.text !== 'string')) throw new Error('DOCUMENT_INVALID');
    if (item.content !== undefined) {
      if (!Array.isArray(item.content)) throw new Error('DOCUMENT_INVALID');
      for (const c of item.content) visit(c, depth+1);
    }
    if (item.marks !== undefined) {
      if (!Array.isArray(item.marks)) throw new Error('DOCUMENT_INVALID');
      for (const mark of item.marks) {
        if(!mark||typeof mark!=='object'||Array.isArray(mark))throw new Error('DOCUMENT_UNSUPPORTED_MARK');
        const m=mark as {type?:string;attrs?:Record<string,unknown>};
        if(!['bold','italic','underline','code','strike','link'].includes(m.type??''))throw new Error('DOCUMENT_UNSUPPORTED_MARK');
        if(m.type==='link'){
          const attrs=m.attrs;
          if(!attrs||typeof attrs!=='object'||Array.isArray(attrs)||!normalizeEditorHref(attrs.href))throw new Error('DOCUMENT_UNSAFE_LINK');
          if(attrs.target!=null&&!['_blank','_self'].includes(String(attrs.target)))throw new Error('DOCUMENT_UNSAFE_LINK');
          if(attrs.rel!=null&&(typeof attrs.rel!=='string'||attrs.rel.length>120))throw new Error('DOCUMENT_UNSAFE_LINK');
          // Opening in a new tab without noopener+noreferrer would allow reverse tabnabbing.
          if(attrs.target==='_blank'&&(
            typeof attrs.rel!=='string'||
            !attrs.rel.split(/\s+/).includes('noopener')||
            !attrs.rel.split(/\s+/).includes('noreferrer')
          ))throw new Error('DOCUMENT_UNSAFE_LINK');
        }
      }
    }
    if (item.attrs !== undefined && (typeof item.attrs !== 'object' || item.attrs === null || Array.isArray(item.attrs))) throw new Error('DOCUMENT_INVALID');
  }
  visit(value, 0);
}
export function plainText(document: unknown): string {
  assertValidDocument(document);
  const parts: string[] = [];
  function traverse(n: any) {
    if (n.type === 'text' && typeof n.text === 'string') parts.push(n.text);
    else if (n.type === 'hardBreak') parts.push('\n');
    else {
      if (Array.isArray(n.content)) for (const child of n.content) traverse(child);
      if (['paragraph','heading','blockquote','codeBlock','listItem'].includes(n.type)) parts.push('\n');
    }
  }
  traverse(document);
  return parts.join('').trim();
}
export function decideSave(baseRevision: number, currentRevision: number): number {
  if (!Number.isSafeInteger(baseRevision) || baseRevision < 0 || !Number.isSafeInteger(currentRevision) || currentRevision < 0) throw new Error('REVISION_INVALID');
  if (baseRevision !== currentRevision) throw new Error('REVISION_CONFLICT');
  return currentRevision + 1;
}
export function transitionAllowed(from: BookStatus, to: BookStatus): boolean {
  const transitions: Record<BookStatus, BookStatus[]> = {
    DRAFT: ['WRITING','ARCHIVED'], WRITING: ['REVIEW','ARCHIVED'],
    REVIEW: ['WRITING','APPROVED','ARCHIVED'], APPROVED: ['REVIEW','PRODUCTION','ARCHIVED'],
    PRODUCTION: ['REVIEW','PUBLISHED','ARCHIVED'], PUBLISHED: ['ARCHIVED'], ARCHIVED: ['DRAFT','WRITING'],
  };
  return transitions[from]?.includes(to) ?? false;
}
export const emptyDocument = (): {type:'doc',content:[{type:'paragraph'}]} => ({type:'doc',content:[{type:'paragraph'}]});
