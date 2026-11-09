export const SEARCH_PAGE_SIZE=30;
export const SEARCH_MAX_OFFSET=30000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const permitted=new Set(['q','bookId','offset']);
export class SearchQueryError extends Error{
 constructor(){super('SEARCH_QUERY_INVALID');this.name='SearchQueryError';}
}
/** A strict, bounded contract for global and single-book current-revision
 * search. Unknown/repeated params cannot silently broaden scope. */
export function parseSearchParams(params:URLSearchParams):{
 q:string;bookId:string|null;offset:number
}{
 for(const key of params.keys()){
   if(!permitted.has(key)||params.getAll(key).length!==1)
     throw new SearchQueryError();
 }
 const q=(params.get('q')??'').trim();
 if(q.length<2||q.length>80||/[\u0000-\u001f\u007f]/.test(q))
   throw new SearchQueryError();
 const rawBookId=params.get('bookId');
 if(rawBookId!==null&&!UUID.test(rawBookId))
   throw new SearchQueryError();
 const rawOffset=params.get('offset')??'0';
 if(!/^(0|[1-9]\d{0,5})$/.test(rawOffset))
   throw new SearchQueryError();
 const offset=Number(rawOffset);
 if(!Number.isSafeInteger(offset)||offset>SEARCH_MAX_OFFSET||
    offset%SEARCH_PAGE_SIZE!==0)
   throw new SearchQueryError();
 return {q,bookId:rawBookId,offset};
}
/** PostgreSQL LIKE wildcards are literal. Backslash is the default LIKE
 * escape in PostgreSQL, so escape it before % and _. */
export function escapeLikeLiteral(input:string):string{
 return '%'+input.replace(/[\\%_]/g,ch=>'\\'+ch)+'%';
}
