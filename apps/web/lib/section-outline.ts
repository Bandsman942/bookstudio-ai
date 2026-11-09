import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

export const MAX_SECTION_RESULTS=300;
export const MAX_SECTION_FILTER_LENGTH=100;
export type SectionHeading={
 position:number;level:1|2|3;title:string
};
export type ChapterSectionOutline={
 headings:SectionHeading[];hasMore:boolean;matches:number
};

/** Read-only, derived chapter section index from the CURRENT in-memory
 * ProseMirror document. NEVER read from the server or mutate a revision.
 * A position is valid only for the exact editor document used to build it. */
export function extractChapterSectionOutline(doc:ProseMirrorNode,
 filter='',limit=MAX_SECTION_RESULTS):ChapterSectionOutline{
 if(typeof filter!=='string'||filter.length>MAX_SECTION_FILTER_LENGTH||
   /[\u0000-\u001f\u007f]/.test(filter)||
   !Number.isSafeInteger(limit)||limit<1||limit>MAX_SECTION_RESULTS)
   throw new Error('SECTION_FILTER_INVALID');
 const needle=filter.trim().toLocaleLowerCase();
 const headings:SectionHeading[]=[];
 let matches=0;
 doc.descendants((node,position)=>{
   if(node.type.name!=='heading')return true;
   const level=node.attrs.level as unknown;
   if(level!==1&&level!==2&&level!==3)return false;
   const title=node.textContent.trim();
   if(!title||needle&&!title.toLocaleLowerCase().includes(needle))
     return false;
   matches++;
   if(headings.length<limit)
     headings.push({position,level,title});
   return false;
 });
 return {headings,hasMore:matches>limit,matches};
}

/** Prevent jumping to a different heading after document edits invalidate
 * previously rendered positions. Recompute from the live editor to confirm. */
export function sameSectionAtPosition(doc:ProseMirrorNode,
 heading:SectionHeading):boolean{
 if(!Number.isSafeInteger(heading.position)||heading.position<0||
   ![1,2,3].includes(heading.level))return false;
 const node=doc.nodeAt(heading.position);
 return node?.type.name==='heading'&&
   node.attrs.level===heading.level&&node.textContent.trim()===heading.title;
}

/** Resolve a saved book-wide TOC ordinal against the exact revision document.
 * Unlike the visible per-chapter outline, this lookup is not capped at 300. */
export function findChapterSectionByOrdinal(doc:ProseMirrorNode,
 ordinal:number):SectionHeading|null{
 if(!Number.isSafeInteger(ordinal)||ordinal<0)return null;
 let current=0,found:SectionHeading|null=null;
 doc.descendants((node,position)=>{
  if(found)return false;
  if(node.type.name!=='heading')return true;
  const level=node.attrs.level as unknown;
  if(level!==1&&level!==2&&level!==3)return false;
  const title=node.textContent.trim();
  if(title){if(current===ordinal)found={position,level,title};current++;}
  return false;
 });
 return found;
}
