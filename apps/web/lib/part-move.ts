import {partsAreContiguous,type PartChapter} from './book-parts.ts';
import {chapterOrderToken} from './chapter-order.ts';
import {createHash} from 'node:crypto';

/** Swap one entire assigned chapter span with the neighbouring span.
 * Unassigned chapters form a movable neighbouring span too. Chapter data,
 * part membership and the original input are never modified. */
export function movePartBlock<T extends PartChapter>(chapters:readonly T[],
  partId:string,direction:'up'|'down'):T[]|null{
  if(!partId||!partsAreContiguous(chapters))return null;
  const start=chapters.findIndex(chapter=>chapter.partId===partId);
  if(start<0)return null;
  let end=start+1;
  while(end<chapters.length&&chapters[end].partId===partId)end++;
  if(direction==='up'){
    if(start===0)return null;
    const neighbourId=chapters[start-1].partId;
    let neighbourStart=start-1;
    while(neighbourStart>0&&chapters[neighbourStart-1].partId===neighbourId)
      neighbourStart--;
    return [...chapters.slice(0,neighbourStart),...chapters.slice(start,end),
      ...chapters.slice(neighbourStart,start),...chapters.slice(end)];
  }
  if(direction==='down'){
    if(end===chapters.length)return null;
    const neighbourId=chapters[end].partId;
    let neighbourEnd=end+1;
    while(neighbourEnd<chapters.length&&chapters[neighbourEnd].partId===neighbourId)
      neighbourEnd++;
    return [...chapters.slice(0,start),...chapters.slice(end,neighbourEnd),
      ...chapters.slice(start,end),...chapters.slice(neighbourEnd)];
  }
  return null;
}

export type PositionedPartChapter=PartChapter&{position:number};
/** A move must be rejected if either positions OR group assignments changed
 * since the client rendered the outline. Never includes chapter text. */
export function partMoveToken(chapters:readonly PositionedPartChapter[]):string{
 const order=chapterOrderToken(chapters);
 return createHash('sha256').update(order+'|'+
  chapters.map(row=>row.partId??'-').join('|')).digest('hex');
}
/** Keep the manuscript's occupied active position slots, including gaps left
 * by soft-deleted chapters. Only positions actually changing are updated. */
export function partBlockPositionChanges<T extends PositionedPartChapter>(
  before:readonly T[],after:readonly T[]):{id:string;from:number;to:number}[]|null{
  if(before.length!==after.length||new Set(before.map(c=>c.id)).size!==before.length||
    new Set(after.map(c=>c.id)).size!==after.length)return null;
  const original=new Map(before.map(c=>[c.id,c]));
  if(after.some(c=>original.get(c.id)!==c))return null;
  return after.flatMap((row,index)=>row.position===before[index].position?[]:
    [{id:row.id,from:row.position,to:before[index].position}]);
}
