/** Browser-only, deterministic writing indicators. No AI, network call or mutation. */
type RichNode={type?:unknown;text?:unknown;content?:unknown};
export type EditorialStructure={words:number;paragraphs:number;headings:number;longParagraphs:number};

const countWords=(value:string)=>value.trim().split(/\s+/u).filter(Boolean).length;

function nodeText(node:RichNode):string{
  if(node.type==='text')return typeof node.text==='string'?node.text:'';
  if(!Array.isArray(node.content))return '';
  return node.content.map(child=>child&&typeof child==='object'?nodeText(child as RichNode):'').join('');
}

export function analyzeEditorialStructure(document:unknown):EditorialStructure{
  const result:EditorialStructure={words:0,paragraphs:0,headings:0,longParagraphs:0};
  if(!document||typeof document!=='object')return result;
  function walk(node:RichNode){
    if(node.type==='paragraph'||node.type==='heading'){
      const words=countWords(nodeText(node));
      result.words+=words;
      if(node.type==='heading')result.headings++;
      else if(words){result.paragraphs++;if(words>180)result.longParagraphs++;}
      return;
    }
    if(Array.isArray(node.content)){
      for(const child of node.content){
        if(child&&typeof child==='object')walk(child as RichNode);
      }
    }
  }
  walk(document as RichNode);
  return result;
}
