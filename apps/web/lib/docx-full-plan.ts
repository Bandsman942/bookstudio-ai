import {proposeDocxChapters,type SplitBlock} from './docx-chapter-split';

// These are transport/transaction budgets, not manuscript preview limits.
export const DOCX_PART_MAX_BLOCKS=180;
export const DOCX_PART_MAX_CHARS=65000;
export const DOCX_BATCH_MAX_PARTS=10;
const MAX_SOURCE_BLOCKS=40000;
const MAX_PROPOSED_PARTS=5000;
type FullPreview={blocks:SplitBlock[];truncated:boolean};
export type ImportPart={title:string;blocks:SplitBlock[];sourceSection:number;continuation:number};
export type ImportBatch={parts:ImportPart[];blockCount:number;characterCount:number};
export type ImportPlan={parts:ImportPart[];batches:ImportBatch[];sourceBlocks:number;sourceCharacters:number;
  hasHeadings:boolean;fallback:boolean;continuations:number};
export class DocxPlanError extends Error {
  readonly code:string;
  constructor(code:string){super(code);this.code=code;this.name='DocxPlanError';}
}
const reject=(code:string):never=>{throw new DocxPlanError(code);};
const chars=(blocks:SplitBlock[])=>blocks.reduce((n,b)=>n+b.text.length,0);
function safeTitle(value:string,position:number){
  const candidate=value.trim().slice(0,180);
  return candidate.length>=2?candidate:'Chapitre '+position;
}
export function planCompleteDocxImport(
 preview:FullPreview,mode:'one'|'sections',singleTitle='Manuscrit',introductionTitle='Introduction'
):ImportPlan {
  if(preview.truncated)reject('DOCX_PREVIEW_TRUNCATED');
  if(!Array.isArray(preview.blocks)||!preview.blocks.length||preview.blocks.length>MAX_SOURCE_BLOCKS)
    reject('DOCX_ARCHIVE_LIMIT');
  for(const b of preview.blocks){
    if(!b||!['heading','paragraph'].includes(b.kind)||typeof b.text!=='string'||
       !b.text.trim()||b.text.length>10000)reject('DOCX_BLOCKS_INVALID');
  }
  const proposal=mode==='sections'?proposeDocxChapters(preview,introductionTitle,5000):null;
  if(proposal?.reason==='invalid'||proposal?.reason==='truncated'||proposal?.reason==='too_many')
    reject('DOCX_STRUCTURE_UNAVAILABLE');
  const sections=proposal?.reason==='ok'?proposal.chapters:
    [{title:singleTitle,blocks:preview.blocks}];
  const parts:ImportPart[]=[];
  let continuations=0,section=0;
  for(const s of sections){
    section++;
    const base=safeTitle(s.title,section);
    let current:SplitBlock[]=[];
    let length=0,partIndex=1;
    const flush=()=>{
      if(!current.length)return;
      if(parts.length>=MAX_PROPOSED_PARTS)reject('DOCX_TOO_MANY_PARTS');
      const suffix=partIndex===1?'':' — suite '+partIndex;
      parts.push({title:base.slice(0,180-suffix.length)+suffix,blocks:current,
        sourceSection:section,continuation:partIndex});
      if(partIndex>1)continuations++;
      partIndex++;current=[];length=0;
    };
    for(const block of s.blocks){
      if(block.text.length>DOCX_PART_MAX_CHARS)reject('DOCX_BLOCKS_INVALID');
      if(current.length&&(current.length>=DOCX_PART_MAX_BLOCKS||
         length+block.text.length>DOCX_PART_MAX_CHARS))flush();
      current.push(block);length+=block.text.length;
    }
    flush();
  }
  const batches:ImportBatch[]=[];let batch:ImportPart[]=[],blocks=0,totalChars=0;
  const flush=()=>{if(batch.length)batches.push({parts:batch,blockCount:blocks,characterCount:totalChars});
    batch=[];blocks=0;totalChars=0;};
  for(const part of parts){
    const n=part.blocks.length,length=chars(part.blocks);
    if(batch.length&&(batch.length>=DOCX_BATCH_MAX_PARTS||
       blocks+n>DOCX_PART_MAX_BLOCKS||totalChars+length>DOCX_PART_MAX_CHARS))flush();
    batch.push(part);blocks+=n;totalChars+=length;
  }
  flush();
  const sourceCharacters=chars(preview.blocks);
  if(batches.reduce((n,b)=>n+b.blockCount,0)!==preview.blocks.length||
     batches.reduce((n,b)=>n+b.characterCount,0)!==sourceCharacters)
    reject('DOCX_DATA_INCOMPLETE');
  return {parts,batches,sourceBlocks:preview.blocks.length,sourceCharacters,
    hasHeadings:proposal?.reason==='ok',fallback:proposal?.fallbackToHeadings??false,continuations};
}
