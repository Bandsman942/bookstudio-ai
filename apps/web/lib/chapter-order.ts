import {createHash} from 'node:crypto';
/** Optimistic structure token; positions and ids only, never manuscript text. */
export type ChapterOrderRow={id:string;position:number};
export function chapterOrderToken(chapters:readonly ChapterOrderRow[]):string{
  if(chapters.length>10000)throw Error('CHAPTER_ORDER_TOO_LARGE');
  const normalized=chapters.map(c=>{
    if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(c.id)||
       !Number.isSafeInteger(c.position)||c.position<0)
      throw Error('CHAPTER_ORDER_INVALID');
    return c.id.toLowerCase()+':'+c.position;
  });
  return createHash('sha256').update(normalized.join('|')).digest('hex');
}
export function nextChapterOrder(chapters:readonly ChapterOrderRow[],
  chapterId:string,direction:'up'|'down'){
  const index=chapters.findIndex(ch=>ch.id===chapterId);
  if(index<0)return null;
  const target=index+(direction==='up'?-1:1);
  if(target<0||target>=chapters.length)return chapters.slice();
  const changed=chapters.slice();
  [changed[index],changed[target]]=[changed[target],changed[index]];
  return changed;
}
