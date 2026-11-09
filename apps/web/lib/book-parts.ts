/** A single Part must occupy one consecutive span in the manuscript's
 * existing global chapter order. Unassigned chapters separate spans. */
export type PartChapter={id:string;partId:string|null};
export function partsAreContiguous(chapters:readonly PartChapter[]):boolean{
 const closed=new Set<string>();
 let current:string|null=null;
 for(const chapter of chapters){
  if(chapter.partId===current)continue;
  if(current)closed.add(current);
  current=chapter.partId;
  if(current&&closed.has(current))return false;
 }
 return true;
}
export function assignChapterPart(chapters:readonly PartChapter[],
 chapterId:string,partId:string|null):PartChapter[]|null{
 if(!chapters.some(chapter=>chapter.id===chapterId))return null;
 const result=chapters.map(chapter=>chapter.id===chapterId?{...chapter,partId}:chapter);
 return partsAreContiguous(result)?result:null;
}
export function partBoundaryIndices(chapters:readonly PartChapter[]):number[]{
 return chapters.flatMap((chapter,index)=>chapter.partId&&
  (index===0||chapter.partId!==chapters[index-1].partId)?[index]:[]);
}
/** Display assigned parts in actual chapter order, not by creation timestamp.
 * Empty parts follow, retaining the original deterministic database order. */
export function orderPartsByChapters<T extends {id:string}>(parts:readonly T[],
 chapters:readonly PartChapter[]):T[]{
 const first=new Map<string,number>();
 chapters.forEach((chapter,index)=>{
  if(chapter.partId&&!first.has(chapter.partId))first.set(chapter.partId,index);
 });
 return parts.map((part,index)=>({part,index})).sort((a,b)=>
  (first.get(a.part.id)??Number.POSITIVE_INFINITY)-
  (first.get(b.part.id)??Number.POSITIVE_INFINITY)||a.index-b.index)
  .map(({part})=>part);
}
