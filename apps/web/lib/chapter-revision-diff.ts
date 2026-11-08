/** Deterministic word/punctuation comparison of two SAVED revision texts.
 * No AI, no HTML, no ProseMirror mutation; strict work/memory budget.
 * Whitespace is preserved exactly, but not counted as a changed unit.
 */
export type DiffKind='equal'|'added'|'removed';
export type DiffSegment={kind:DiffKind;text:string};
export type RevisionTextDiff={
  counts:{added:number;removed:number;unchanged:number};
  segments:DiffSegment[];algorithm:'word-lcs-bounded-v1';
  formattingMayDiffer:boolean;
};
export const REVISION_DIFF_MAX_CHARACTERS=250_000;
export const REVISION_DIFF_MAX_TOKENS=12_000;
export const REVISION_DIFF_MAX_CELLS=4_000_000;
const tokenize=(s:string)=>s.match(/\s+|[\p{L}\p{N}\p{M}]+|[^\s\p{L}\p{N}\p{M}]+/gu)??[];
const counted=(s:string)=>!/^\s+$/u.test(s);

export function compareSavedRevisionText(left:string,right:string,
  leftHash?:string,rightHash?:string):RevisionTextDiff{
 if(typeof left!=='string'||typeof right!=='string')throw Error('REVISION_COMPARISON_SOURCE_INVALID');
 if(left.length>REVISION_DIFF_MAX_CHARACTERS||
    right.length>REVISION_DIFF_MAX_CHARACTERS)
   throw Error('REVISION_COMPARISON_TOO_LARGE');
 const a=tokenize(left),b=tokenize(right);
 if(a.length>REVISION_DIFF_MAX_TOKENS||b.length>REVISION_DIFF_MAX_TOKENS)
   throw Error('REVISION_COMPARISON_TOO_LARGE');
 let prefix=0,suffix=0;
 while(prefix<Math.min(a.length,b.length)&&a[prefix]===b[prefix])prefix++;
 while(suffix<a.length-prefix&&suffix<b.length-prefix&&
   a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
 const n=a.length-prefix-suffix,m=b.length-prefix-suffix;
 if(n*m>REVISION_DIFF_MAX_CELLS)throw Error('REVISION_COMPARISON_TOO_LARGE');
 const columns=m+1,matrix=new Uint16Array((n+1)*columns);
 for(let i=n-1;i>=0;i--){
   for(let j=m-1;j>=0;j--){
     const at=i*columns+j;
     matrix[at]=a[prefix+i]===b[prefix+j]?
       matrix[at+columns+1]+1:
       Math.max(matrix[at+columns],matrix[at+1]);
   }
 }
 const segments:DiffSegment[]=[],counts={added:0,removed:0,unchanged:0};
 function emit(kind:DiffKind,token:string){
   if(!token)return;
   if(counted(token))counts[kind]++;
   const last=segments[segments.length-1];
   if(last?.kind===kind)last.text+=token;
   else segments.push({kind,text:token});
 }
 for(let i=0;i<prefix;i++)emit('equal',a[i]);
 let i=0,j=0;
 while(i<n||j<m){
   if(i<n&&j<m&&a[prefix+i]===b[prefix+j]){
     emit('equal',a[prefix+i]);i++;j++;
   }else if(i<n&&(j===m||
     matrix[(i+1)*columns+j]>=matrix[i*columns+j+1])){
     emit('removed',a[prefix+i]);i++;
   }else{emit('added',b[prefix+j]);j++;}
 }
 for(let k=suffix;k>0;k--)emit('equal',a[a.length-k]);
 return {counts,segments,algorithm:'word-lcs-bounded-v1',
   formattingMayDiffer:left===right&&typeof leftHash==='string'&&
     typeof rightHash==='string'&&leftHash!==rightHash};
}
