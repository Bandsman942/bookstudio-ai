export type ChapterFingerprint={
  id:string;title:string;position:number;contentHash:string
};
export type EditionPair={
  from:{id:string;title:string;position:number};
  to:{id:string;title:string;position:number};
  matchedBy:'same-slot'|'unique-hash'|'unique-title';
  titleChanged:boolean;contentChanged:boolean;positionChanged:boolean
};
export type EditionDifference={
  counts:{from:number;to:number;unchanged:number;changed:number;
    renamed:number;contentChanged:number;moved:number;added:number;removed:number};
  pairs:EditionPair[];
  added:{id:string;title:string;position:number}[];
  removed:{id:string;title:string;position:number}[];
  limitations:string
};
const normalize=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase('en');
const brief=(c:ChapterFingerprint)=>({id:c.id,title:c.title,position:c.position});
/**
 * Conservative structural comparison of two immutable edition states:
 * 1 same slot/title/hash; 2 unique full-content fingerprint;
 * 3 unique normalized title. Never infer chapter ancestry from ambiguous
 * matches, and NEVER expose manuscript prose or hashes to the browser.
 */
export function compareEditionFingerprints(
  from:readonly ChapterFingerprint[],to:readonly ChapterFingerprint[]
):EditionDifference{
  const older=new Map(from.map(c=>[c.id,c])),newer=new Map(to.map(c=>[c.id,c]));
  const links:EditionPair[]=[];
  const pair=(a:ChapterFingerprint,b:ChapterFingerprint,
    matchedBy:EditionPair['matchedBy'])=>{
    older.delete(a.id);newer.delete(b.id);
    links.push({from:brief(a),to:brief(b),matchedBy,
      titleChanged:normalize(a.title)!==normalize(b.title),
      contentChanged:a.contentHash!==b.contentHash,
      positionChanged:a.position!==b.position});
  };
  function unique(key:(c:ChapterFingerprint)=>string,match:EditionPair['matchedBy']){
    const group=(items:ChapterFingerprint[])=>{
      const groups=new Map<string,ChapterFingerprint[]>();
      for(const item of items){
        const k=key(item);
        if(!k)continue;
        const list=groups.get(k)??[];
        list.push(item);groups.set(k,list);
      }
      return groups;
    };
    const lhs=group([...older.values()]),rhs=group([...newer.values()]);
    for(const [k,list] of lhs){
      const candidates=rhs.get(k);
      if(list.length===1&&candidates?.length===1){
        const a=list[0],b=candidates[0];
        if(older.has(a.id)&&newer.has(b.id))pair(a,b,match);
      }
    }
  }
  unique(c=>JSON.stringify([c.position,normalize(c.title),c.contentHash]),'same-slot');
  unique(c=>c.contentHash,'unique-hash');
  unique(c=>normalize(c.title),'unique-title');
  links.sort((a,b)=>a.to.position-b.to.position||a.to.id.localeCompare(b.to.id));
  const added=[...newer.values()].sort((a,b)=>a.position-b.position).map(brief);
  const removed=[...older.values()].sort((a,b)=>a.position-b.position).map(brief);
  const changed=links.filter(c=>c.titleChanged||c.contentChanged||c.positionChanged);
  return {counts:{
    from:from.length,to:to.length,unchanged:links.length-changed.length,
    changed:changed.length,renamed:changed.filter(c=>c.titleChanged).length,
    contentChanged:changed.filter(c=>c.contentChanged).length,
    moved:changed.filter(c=>c.positionChanged).length,
    added:added.length,removed:removed.length},
    pairs:changed,added,removed,
    limitations:'fingerprints-and-unique-titles-no-guaranteed-chapter-lineage'
  };
}
