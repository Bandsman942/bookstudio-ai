import {createHash} from 'node:crypto';

export const LIBRARY_TYPES=['GENERAL','NOVEL','ESSAY','SCIENCE','MEDICINE','EDUCATION'] as const;
export const LIBRARY_STAGES=['DRAFT','WRITING','REVIEW','APPROVED','PRODUCTION','PUBLISHED'] as const;
export const MAX_LIBRARY_PAGE=100;
export type LibrarySort='recent'|'title';
export type LibraryFilters={archived:boolean;q:string;type:string;status:string;sort:LibrarySort;
  limit:number;cursor:string|null};
export type LibraryCursor={v:1;scope:string;sort:LibrarySort;key:string;id:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
export class LibraryQueryError extends Error{
  constructor(){super('LIBRARY_FILTER_INVALID');}
}
export function parseLibraryFilters(params:URLSearchParams,defaultLimit=100):LibraryFilters{
  const archived=params.get('archived'),q=params.get('q')??'',type=params.get('type')??'',
    status=params.get('status')??'',sort=params.get('sort')??'recent',
    limitParam=params.get('limit'),cursor=params.get('cursor');
  if((archived!==null&&archived!=='1')||q.trim().length>80||/[\x00-\x1f\x7f]/.test(q)||
    (type!==''&&!LIBRARY_TYPES.includes(type as typeof LIBRARY_TYPES[number]))||
    (status!==''&&!LIBRARY_STAGES.includes(status as typeof LIBRARY_STAGES[number]))||
    (sort!=='recent'&&sort!=='title')||
    (cursor!==null&&(cursor.length>850||cursor.length<16||
      !/^[A-Za-z0-9_-]+$/.test(cursor))))throw new LibraryQueryError();
  const limit=limitParam===null?defaultLimit:Number(limitParam);
  if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_LIBRARY_PAGE)
    throw new LibraryQueryError();
  return {archived:archived==='1',q:q.trim(),type,status,sort:sort as LibrarySort,
    limit,cursor};
}
export function scopeForFilters(filters:LibraryFilters):string{
  const key=JSON.stringify([filters.archived,filters.q,filters.type,filters.status,filters.sort]);
  return createHash('sha256').update(key).digest('hex');
}
export function encodeLibraryCursor(sort:LibrarySort,key:string,id:string,scope:string):string{
  const entry:LibraryCursor={v:1,scope,sort,key,id};
  return Buffer.from(JSON.stringify(entry),'utf8').toString('base64url');
}
export function decodeLibraryCursor(value:string,filters:LibraryFilters):LibraryCursor{
  try{
    const parsed=JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as LibraryCursor;
    if(!parsed||typeof parsed!=='object'||Object.keys(parsed).length!==5||
       parsed.v!==1||parsed.scope!==scopeForFilters(filters)||parsed.sort!==filters.sort||
       !HEX.test(parsed.scope)||typeof parsed.key!=='string'||parsed.key.length>180||
       !UUID.test(parsed.id))throw new LibraryQueryError();
    if(filters.sort==='recent'){
      const d=new Date(parsed.key);
      if(!Number.isFinite(d.valueOf())||d.toISOString()!==parsed.key)
        throw new LibraryQueryError();
    }else if(parsed.key.length<1)throw new LibraryQueryError();
    return parsed;
  }catch{throw new LibraryQueryError();}
}
