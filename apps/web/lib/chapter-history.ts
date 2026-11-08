export type HistoryRequest={limit:number;before:number|null};
export type RevisionSummary={sequence:number;createdAt:Date;author:{name:string}};
export const HISTORY_DEFAULT_LIMIT=20;
export const HISTORY_MAX_LIMIT=50;
const whole=/^(0|[1-9][0-9]*)$/;

/** Strict keyset pagination prevents scanning arbitrary OFFSETs over long books. */
export function parseHistoryRequest(url:string):HistoryRequest{
 const q=new URL(url).searchParams;
 if([...q.keys()].some(k=>k!=='limit'&&k!=='before')||
    q.getAll('limit').length>1||q.getAll('before').length>1)
   throw new Error('REVISION_HISTORY_QUERY_INVALID');
 const l=q.get('limit'),b=q.get('before');
 if((l!==null&&!whole.test(l))||(b!==null&&!whole.test(b)))
   throw new Error('REVISION_HISTORY_QUERY_INVALID');
 const limit=l===null?HISTORY_DEFAULT_LIMIT:Number(l);
 const before=b===null?null:Number(b);
 if(!Number.isSafeInteger(limit)||limit<1||limit>HISTORY_MAX_LIMIT||
   (before!==null&&(!Number.isSafeInteger(before)||before<0)))
   throw new Error('REVISION_HISTORY_QUERY_INVALID');
 return {limit,before};
}
export function takeHistoryPage<T extends {sequence:number}>(rows:T[],limit:number){
 const items=rows.slice(0,limit);
 return {items,nextBefore:rows.length>limit?items[items.length-1]?.sequence??null:null};
}
