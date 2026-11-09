import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSearchParams,escapeLikeLiteral,SEARCH_PAGE_SIZE,SEARCH_MAX_OFFSET}
 from './search-paging.ts';
const uuid='123e4567-e89b-42d3-a456-426614174000';
test('global and per-book search parse with complete page boundaries',()=>{
 assert.equal(SEARCH_PAGE_SIZE,30);
 assert.deepEqual(parseSearchParams(new URLSearchParams('q=+Maths+')),{
   q:'Maths',bookId:null,offset:0});
 assert.deepEqual(parseSearchParams(new URLSearchParams(
   'q=+Été&bookId='+uuid+'&offset=60')),{q:'Été',bookId:uuid,offset:60});
 assert.equal(SEARCH_MAX_OFFSET,30000);
});
test('unknown, duplicate or invalid scope/offset never broadens search',()=>{
 for(const value of [
  'q=ab&q=xy','q=ab&bookId=invalid',
  'q=ab&bookId='+uuid+'&bookId='+uuid,
  'q=ab&offset=1','q=ab&offset=-30',
  'q=ab&offset=30030','q=ab&offset=03',
  'q=ab&unknown=true','q=a',
  'q='+encodeURIComponent('x'.repeat(81)),
  'q='+encodeURIComponent('a\nb')
 ]){
   assert.throws(()=>parseSearchParams(new URLSearchParams(value)),
     /SEARCH_QUERY_INVALID/,value);
 }
});
test('SQL wildcard and slash characters are escaped as literal',()=>{
 assert.equal(escapeLikeLiteral('%_\\'),'%\\%\\_\\\\%');
 assert.equal(escapeLikeLiteral('été'),'%été%');
});
