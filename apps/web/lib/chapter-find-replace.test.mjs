import test from 'node:test';
import assert from 'node:assert/strict';
import {Schema} from '@tiptap/pm/model';
import {EditorState} from '@tiptap/pm/state';
import {history,undo} from '@tiptap/pm/history';
import {findChapterTextMatches,applyChapterTextReplacements,
 FIND_MAX_MATCHES,validateChapterReplacement} from './chapter-find-replace.ts';

const schema=new Schema({
 nodes:{
   doc:{content:'block+'},
   paragraph:{content:'inline*',group:'block'},
   heading:{content:'inline*',group:'block',attrs:{level:{default:1}}},
   text:{group:'inline'}
 },
 marks:{
   bold:{},
   italic:{},
   link:{attrs:{href:{}},inclusive:false}
 }
});
const p=(...runs)=>schema.node('paragraph',null,runs);
const make=(...paragraphs)=>schema.node('doc',null,paragraphs);

test('literal case-insensitive search keeps exact UTF-16 node positions',()=>{
 const doc=make(p(schema.text('Été été en 2026.')));
 const result=findChapterTextMatches(doc,'été');
 assert.equal(result.limited,false);
 assert.equal(result.matches.length,2);
 assert.equal(doc.textBetween(result.matches[0].from,result.matches[0].to),'Été');
 assert.equal(doc.textBetween(result.matches[1].from,result.matches[1].to),'été');
 assert.equal(findChapterTextMatches(doc,'.*').matches.length,0,
   'regex metacharacters are literal');
 assert.equal(findChapterTextMatches(doc,'Été',true).matches.length,1);
 assert.equal(findChapterTextMatches(doc,'').matches.length,0);
 assert.throws(()=>findChapterTextMatches(doc,'a'.repeat(121)),
  /FIND_QUERY_INVALID/);
});

test('replacement preserves unrelated bold / italic runs and history undo',()=>{
 const bold=schema.marks.bold.create();
 const italic=schema.marks.italic.create();
 const doc=make(
   p(schema.text('mot', [bold]),schema.text(' puis '),schema.text('mot',[italic])),
   p(schema.text('mots et mot.'))
 );
 const found=findChapterTextMatches(doc,'mot');
 assert.equal(found.matches.length,4);
 let state=EditorState.create({schema,doc,plugins:[history()]});
 state=state.apply(applyChapterTextReplacements(state.tr,found.matches,'livre'));
 assert.equal(state.doc.textContent,'livre puis livrelivres et livre.');
 const out=state.doc.toJSON();
 assert.deepEqual(out.content[0].content[0].marks,[{type:'bold'}]);
 assert.deepEqual(out.content[0].content[2].marks,[{type:'italic'}]);
 let reversal;
 assert.equal(undo(state,tr=>{reversal=tr;}),true);
 state=state.apply(reversal);
 assert.deepEqual(state.doc.toJSON(),doc.toJSON(),'one Undo restores original');
});

test('does not flatten matches crossing two differently formatted text nodes',()=>{
 const doc=make(p(schema.text('en '),
  schema.text('é', [schema.marks.bold.create()]),schema.text('té')));
 assert.equal(findChapterTextMatches(doc,'été').matches.length,0);
 assert.equal(findChapterTextMatches(doc,'té').matches.length,1);
});

test('returns bounded results and never silently replaces a partial scan',()=>{
 const doc=make(p(schema.text('x '.repeat(FIND_MAX_MATCHES+2))));
 const result=findChapterTextMatches(doc,'x');
 assert.equal(result.matches.length,FIND_MAX_MATCHES);
 assert.equal(result.limited,true);
 assert.throws(()=>applyChapterTextReplacements(
  EditorState.create({schema,doc}).tr,[...result.matches,result.matches.at(-1)],'z'),
  /REPLACE_TOO_MANY/);
});

test('rejects unsafe replacement and oversize without dispatch',()=>{
 const doc=make(p(schema.text('x')));
 assert.throws(()=>validateChapterReplacement('y'.repeat(1001)),
  /REPLACE_VALUE_INVALID/);
 assert.throws(()=>validateChapterReplacement('a\nb'),
  /REPLACE_VALUE_INVALID/);
 const tr=EditorState.create({schema,doc}).tr;
 const before=tr.doc.toJSON();
 assert.throws(()=>applyChapterTextReplacements(tr,[{from:1,to:2}],
  'z'.repeat(1000)).doc.toJSON().content[0].content[0].text.length>1_000_000,
  /./);
 assert.deepEqual(before,doc.toJSON());
});
