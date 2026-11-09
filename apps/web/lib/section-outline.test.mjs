import test from 'node:test';
import assert from 'node:assert/strict';
import {Schema} from '@tiptap/pm/model';
import {EditorState,TextSelection} from '@tiptap/pm/state';
import {extractChapterSectionOutline,sameSectionAtPosition,MAX_SECTION_RESULTS}
 from './section-outline.ts';
const schema=new Schema({
 nodes:{
   doc:{content:'block+'},
   paragraph:{group:'block',content:'inline*'},
   heading:{group:'block',content:'inline*',attrs:{level:{default:1}}},
   text:{group:'inline'}
 },
 marks:{bold:{}}
});
const txt=(s,marks)=>schema.text(s,marks);
const heading=(level,...runs)=>schema.node('heading',{level},runs);
const paragraph=(s)=>schema.node('paragraph',null,s?[txt(s)]:[]);
const doc=(...nodes)=>schema.node('doc',null,nodes);

test('live H1-H3 outline preserves document order, ProseMirror positions and marks',()=>{
 const original=doc(
   paragraph('Préface non titrée'),
   heading(1,txt('Introduction')),
   paragraph('Une histoire'),
   heading(2,txt('L’été '),txt('scientifique',[schema.marks.bold.create()])),
   heading(3,txt('Résultats 🩺')),
   heading(4,txt('H4 non supporté')),
   heading(2),
   paragraph('Conclusion')
 );
 const before=original.toJSON();
 const r=extractChapterSectionOutline(original);
 assert.equal(r.matches,3);
 assert.equal(r.hasMore,false);
 assert.deepEqual(r.headings.map(h=>[h.level,h.title]),[
   [1,'Introduction'],[2,'L’été scientifique'],[3,'Résultats 🩺']
 ]);
 for(const item of r.headings){
   assert.equal(original.nodeAt(item.position)?.textContent.trim(),item.title);
   assert.equal(sameSectionAtPosition(original,item),true);
 }
 assert.deepEqual(original.toJSON(),before,'outline never rewrites document');
 assert.equal(extractChapterSectionOutline(original,'SCIENTIFIQUE').matches,1);
 assert.equal(extractChapterSectionOutline(original,'🩺').matches,1);
 assert.equal(extractChapterSectionOutline(original,'absent').matches,0);
 assert.equal(extractChapterSectionOutline(doc(paragraph('Bonjour'))).matches,0);
});

test('heading navigation changes only selection, not document or edit history',()=>{
 const original=doc(paragraph('Avant'),heading(1,txt('Se déplacer')),
   paragraph('Après'));
 const item=extractChapterSectionOutline(original).headings[0];
 const state=EditorState.create({schema,doc:original});
 const transaction=state.tr.setSelection(
   TextSelection.create(state.doc,item.position+1)
 ).scrollIntoView();
 assert.equal(transaction.docChanged,false);
 const next=state.apply(transaction);
 assert.equal(next.selection.from,item.position+1);
 assert.deepEqual(next.doc.toJSON(),original.toJSON());
 assert.equal(sameSectionAtPosition(next.doc,item),true);
 const changed=doc(paragraph('Avant'),paragraph('Inséré'),
   heading(1,txt('Se déplacer')),paragraph('Après'));
 assert.equal(sameSectionAtPosition(changed,item),false,
   'stale heading positions must not navigate to another block');
});

test('long outline is explicitly bounded and filter reveals later headings',()=>{
 const nodes=Array.from({length:MAX_SECTION_RESULTS+11},
   (_,i)=>heading((i%3)+1,txt('Partie '+String(i+1))));
 const original=doc(...nodes);
 const r=extractChapterSectionOutline(original);
 assert.equal(r.headings.length,MAX_SECTION_RESULTS);
 assert.equal(r.matches,MAX_SECTION_RESULTS+11);
 assert.equal(r.hasMore,true);
 const filtered=extractChapterSectionOutline(original,'Partie 310');
 assert.equal(filtered.matches,1);
 assert.equal(filtered.hasMore,false);
 assert.equal(filtered.headings[0].title,'Partie 310');
 for(const value of ['\n','a'.repeat(101),'\0']){
   assert.throws(()=>extractChapterSectionOutline(original,value),
     /SECTION_FILTER_INVALID/);
 }
 assert.throws(()=>extractChapterSectionOutline(original,'',MAX_SECTION_RESULTS+1),
   /SECTION_FILTER_INVALID/);
});
