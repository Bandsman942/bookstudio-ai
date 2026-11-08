/** Bound and validate private destination search; never silently ignore
 * unexpected URL options. The client refines if >50 results match. */
export const CHAPTER_COPY_TARGET_PAGE_SIZE=50;
export function parseChapterTargetSearch(params:URLSearchParams):string{
 if([...params.keys()].some(key=>key!=='search')||
    params.getAll('search').length>1)throw Error('CHAPTER_DESTINATION_QUERY_INVALID');
 const raw=params.get('search')??'';
 if(raw.length>100||raw.includes('\0'))
   throw Error('CHAPTER_DESTINATION_QUERY_INVALID');
 return raw.trim();
}
