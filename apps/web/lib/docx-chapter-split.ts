/** Pure, conservative proposal of multiple chapters from a human-readable DOCX preview. */
export type SplitBlock={kind:'heading'|'paragraph';text:string;style?:string};
export type ProposedChapter={title:string;blocks:SplitBlock[]};
export type SplitResult={chapters:ProposedChapter[];reason:'ok'|'truncated'|'too_many'|'no_headings'|'invalid';fallbackToHeadings:boolean};
const TITLE_ONE=/^(heading|titre)[\s_-]*1$/i;
export function proposeDocxChapters(
  preview:{blocks:SplitBlock[];truncated:boolean},
  introductionTitle='Introduction',
  maxChapters=10
):SplitResult{
  const empty=(reason:SplitResult['reason'],fallbackToHeadings=false):SplitResult=>
    ({chapters:[],reason,fallbackToHeadings});
  if(preview.truncated)return empty('truncated');
  if(!Array.isArray(preview.blocks)||preview.blocks.length<2||preview.blocks.length>200)
    return empty('invalid');
  let total=0;
  for(const block of preview.blocks){
    if(!block||!['heading','paragraph'].includes(block.kind)||typeof block.text!=='string'||
       !block.text.trim()||block.text.length>10000)return empty('invalid');
    total+=block.text.length;
    if(total>100000)return empty('invalid');
  }
  const topCount=preview.blocks.filter(b=>b.kind==='heading'&&TITLE_ONE.test(b.style??'')).length;
  const useTop=topCount>=2;
  const isBoundary=(b:SplitBlock)=>b.kind==='heading'&&
    (!useTop||TITLE_ONE.test(b.style??''));
  const sections:ProposedChapter[]=[];
  let current:ProposedChapter|null=null;
  for(const block of preview.blocks){
    if(isBoundary(block)){
      if(current?.blocks.length)sections.push(current);
      current={title:block.text.slice(0,180),blocks:[]};
    }else if(!current)current={title:introductionTitle,blocks:[]};
    current.blocks.push(block);
    if(sections.length+(current?1:0)>maxChapters)return empty('too_many',!useTop);
  }
  if(current?.blocks.length)sections.push(current);
  if(sections.length<2)return empty('no_headings',!useTop);
  return {chapters:sections,reason:'ok',fallbackToHeadings:!useTop};
}
