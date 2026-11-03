import {createHash} from 'node:crypto';
import {prepareReviewedDocxImport,ReviewedImportError,type ReviewedDocxImport} from './reviewed-docx-import';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type ReviewedDocxBatch={sourceName:string;batchId:string;chapters:ReviewedDocxImport[]};

/** Derive stable UUIDv4-shaped operation keys for transaction/replay determinism. */
export function deriveBatchOperationId(batchId:string,index:number):string{
  if(!UUID.test(batchId)||!Number.isInteger(index)||index<0||index>=10)
    throw new ReviewedImportError('DOCX_BATCH_INVALID');
  const bytes=createHash('sha256').update('bookstudio-docx-batch-v1:'+batchId+':'+index).digest().subarray(0,16);
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const s=bytes.toString('hex');
  return [s.slice(0,8),s.slice(8,12),s.slice(12,16),s.slice(16,20),s.slice(20,32)].join('-');
}

/** All chapters must be explicitly approved as a single immutable batch. */
export function prepareReviewedDocxBatch(value:unknown):ReviewedDocxBatch{
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new ReviewedImportError('DOCX_BATCH_INVALID');
  const x=value as Record<string,unknown>;
  if(x.confirm!=='IMPORT_REVIEWED_DOCX_BATCH'||x.acknowledged!==true)
    throw new ReviewedImportError('DOCX_REVIEW_REQUIRED');
  if(x.truncated!==false)throw new ReviewedImportError('DOCX_PREVIEW_TRUNCATED');
  if(typeof x.batchId!=='string'||!UUID.test(x.batchId))
    throw new ReviewedImportError('DOCX_BATCH_INVALID');
  if(!Array.isArray(x.chapters)||x.chapters.length<2||x.chapters.length>10)
    throw new ReviewedImportError('DOCX_BATCH_COUNT_INVALID');
  let blocks=0,chars=0;
  const chapters=x.chapters.map((chapter,index)=>{
    if(!chapter||typeof chapter!=='object'||Array.isArray(chapter))
      throw new ReviewedImportError('DOCX_BATCH_INVALID');
    const data=chapter as Record<string,unknown>;
    const prepared=prepareReviewedDocxImport({
      title:data.title,blocks:data.blocks,sourceName:x.sourceName,
      operationId:deriveBatchOperationId(x.batchId as string,index),
      confirm:'IMPORT_REVIEWED_DOCX',acknowledged:true,truncated:false
    });
    blocks+=prepared.content.content.length;
    chars+=prepared.text.length;
    if(blocks>200||chars>100000)throw new ReviewedImportError('DOCX_BATCH_TOO_LARGE');
    return prepared;
  });
  const sourceName=chapters[0].sourceName;
  if(chapters.some(x=>x.sourceName!==sourceName))throw new ReviewedImportError('DOCX_BATCH_INVALID');
  return {sourceName,batchId:x.batchId as string,chapters};
}
