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
