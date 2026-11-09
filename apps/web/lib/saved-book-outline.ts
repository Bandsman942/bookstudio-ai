/** Read-only projection of H1–H3 from an immutable, saved ProseMirror JSON revision.
 * Text from paragraphs, comments and non-heading blocks must never enter the response. */
export const SAVED_OUTLINE_PAGE_SIZE=60;
export const SAVED_OUTLINE_MAX_FILTER_LENGTH=100;
export const SAVED_OUTLINE_MAX_OFFSET=100_000;

type Node={type?:unknown;attrs?:unknown;text?:unknown;content?:unknown};
export type SavedHeading={ordinal:number;level:1|2|3;title:string};
export type SavedOutlinePage={headings:SavedHeading[];total:number;hasMore:boolean};

function headingLevel(node:Node):1|2|3|null{
 if(node.type!=='heading'||!node.attrs||typeof node.attrs!=='object')return null;
 const level=(node.attrs as {level?:unknown}).level;
 return level===1||level===2||level===3?level:null;
}
function inlineText(node:Node):string{
 if(node.type==='text')return typeof node.text==='string'?node.text:'';
 if(node.type==='hardBreak')return ' ';
 if(!Array.isArray(node.content))return '';
 return node.content.map(item=>item&&typeof item==='object'?inlineText(item as Node):'').join('');
}
export function validSavedOutlineQuery(filter:string,offset:number):boolean{
 return typeof filter==='string'&&filter.length<=SAVED_OUTLINE_MAX_FILTER_LENGTH&&
  !/[\u0000-\u001f\u007f]/u.test(filter)&&Number.isSafeInteger(offset)&&
  offset>=0&&offset<=SAVED_OUTLINE_MAX_OFFSET;
}

/** Ordinals are absolute, unfiltered positions among nonempty H1–H3 headings.
 * Filtering and pagination never renumber a heading, so links remain stable. */
export function savedBookOutlinePage(document:unknown,filter='',offset=0):SavedOutlinePage{
 if(!validSavedOutlineQuery(filter,offset))throw new Error('OUTLINE_QUERY_INVALID');
 const needle=filter.trim().toLocaleLowerCase();
 const headings:SavedHeading[]=[];
 let ordinal=0,total=0;
 if(!document||typeof document!=='object')return {headings,total,hasMore:false};
 const stack:Node[]=[document as Node];
 while(stack.length){
  const node=stack.pop()!;
  const level=headingLevel(node);
  if(level){
   const title=inlineText(node).trim();
   if(title){
    const currentOrdinal=ordinal++;
    if(!needle||title.toLocaleLowerCase().includes(needle)){
     if(total>=offset&&headings.length<SAVED_OUTLINE_PAGE_SIZE)
      headings.push({ordinal:currentOrdinal,level,title});
     total++;
    }
   }
   continue;
  }
  if(Array.isArray(node.content)){
   for(let i=node.content.length-1;i>=0;i--){
    const child=node.content[i];
    if(child&&typeof child==='object')stack.push(child as Node);
   }
  }
 }
 return {headings,total,hasMore:offset+headings.length<total};
}
