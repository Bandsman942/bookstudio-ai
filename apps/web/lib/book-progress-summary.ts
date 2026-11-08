export type ProgressChapter={
 id:string;title:string;revisionSeq:number;updatedAt:Date|string
};
export type LatestChapterText={chapterId:string;hasText:boolean};
export type ProgressSummary={
 activeChapters:number;writtenChapters:number;emptyChapters:number;
 writingCoveragePercent:number;
 latestChapter:{id:string;title:string;updatedAt:string}|null;
 chapterStates:{chapterId:string;hasText:boolean}[];
};

/**
 * This is only the proportion of active chapters with saved non-whitespace text,
 * NOT a percentage of completion, editorial approval or words written.
 */
export function summarizeBookChapters(
 chapters:readonly ProgressChapter[],
 latestTexts:readonly LatestChapterText[]
):ProgressSummary{
 const validIds=new Set(chapters.map(x=>x.id));
 const writtenIds=new Set(latestTexts.filter(x=>x.hasText&&validIds.has(x.chapterId))
   .map(x=>x.chapterId));
 const active=chapters.length,written=writtenIds.size;
 const sorted=[...chapters].sort((a,b)=>{
   const delta=new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime();
   return delta||a.id.localeCompare(b.id);
 });
 const last=sorted[0];
 return {
  activeChapters:active,writtenChapters:written,emptyChapters:active-written,
  writingCoveragePercent:active?Math.round(100*written/active):0,
  latestChapter:last?{id:last.id,title:last.title,
    updatedAt:new Date(last.updatedAt).toISOString()}:null,
  chapterStates:chapters.map(c=>({chapterId:c.id,hasText:writtenIds.has(c.id)}))
 };
}
