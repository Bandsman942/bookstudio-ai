import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeEditorialStructure} from './editorial-structure.ts';

test('counts styled paragraphs and headings without altering manuscript',()=>{
  const input={type:'doc',content:[
    {type:'heading',attrs:{level:2},content:[{type:'text',text:'Introduction générale'}]},
    {type:'paragraph',content:[{type:'text',text:'La santé '},{type:'text',text:'publique',marks:[{type:'bold'}]}]},
    {type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'Une liste'}]}]}]},
    {type:'paragraph',content:[]}
  ]};
  const before=JSON.stringify(input);
  assert.deepEqual(analyzeEditorialStructure(input),{words:7,paragraphs:2,headings:1,longParagraphs:0});
  assert.equal(JSON.stringify(input),before);
});

test('flags long paragraphs but does not truncate or transmit content',()=>{
  const text=Array.from({length:181},(_,i)=>`mot${i}`).join(' ');
  const result=analyzeEditorialStructure({type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]});
  assert.deepEqual(result,{words:181,paragraphs:1,headings:0,longParagraphs:1});
  assert.deepEqual(analyzeEditorialStructure(null),{words:0,paragraphs:0,headings:0,longParagraphs:0});
});

test('hard breaks separate words and accented text is preserved',()=>{
  const document={type:'doc',content:[{type:'paragraph',content:[
    {type:'text',text:'Santé'},{type:'hardBreak'},{type:'text',text:'publique'}
  ]}]};
  assert.deepEqual(analyzeEditorialStructure(document),
    {words:2,paragraphs:1,headings:0,longParagraphs:0});
});
