import {Prisma} from '@prisma/client';
import {prisma} from '@bookstudio/database';
import {randomUUID} from 'node:crypto';
import {activeUser} from '@/lib/auth';
import {errorResponse,isSameOrigin} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{bookId:string}>};
const headers={'Cache-Control':'private, no-store'};
const MAX_CHAPTERS=500;
const MAX_COPY_BYTES=20*1024*1024;
type LastRevision={chapterId:string;content:Prisma.JsonValue;
 text:string;contentHash:string};

export async function GET(_request:Request,{params}:Ctx){
 const user=await activeUser();
 if(!user)return errorResponse('UNAUTHENTICATED',401);
 const {bookId}=await params;
 try{
   const book=await prisma.book.findFirst({
     where:{id:bookId,archivedAt:null,workspace:{memberships:{some:{userId:user.id}}}},
     select:{updatedAt:true,status:true,editions:{
       orderBy:{number:'desc'},
       select:{id:true,number:true,language:true,
         manuscript:{select:{_count:{select:{chapters:true}}}}
       }
     }}
   });
   if(!book)return errorResponse('NOT_FOUND',404);
   const editions=book.editions.map(e=>({
     id:e.id,number:e.number,language:e.language,
     chapterCount:e.manuscript?._count.chapters??0,
     isCurrent:e.id===book.editions[0]?.id
   }));
   return Response.json({
     editions,currentEditionId:book.editions[0]?.id??null,
     expectedUpdatedAt:book.updatedAt.toISOString(),status:book.status
   },{headers});
 }catch{return errorResponse('EDITION_LIST_UNAVAILABLE',503);}
}

export async function POST(request:Request,{params}:Ctx){
 if(!isSameOrigin(request))return errorResponse('ORIGIN_FORBIDDEN',403);
 const user=await activeUser();if(!user)return errorResponse('UNAUTHENTICATED',401);
 if(Number(request.headers.get('content-length')||0)>2048)
   return errorResponse('VALIDATION_ERROR',413);
 const input=await request.json().catch(()=>null);
 if(!input||typeof input!=='object'||Array.isArray(input)||
   input.confirm!=='CREATE_EDITION_FROM_SAVED'||
   typeof input.expectedEditionId!=='string'||
   !/^[0-9a-f-]{36}$/i.test(input.expectedEditionId)||
   typeof input.expectedUpdatedAt!=='string')
   return errorResponse('EDITION_REQUEST_INVALID',400);
 const expected=new Date(input.expectedUpdatedAt);
 if(!Number.isFinite(expected.getTime())||
    expected.toISOString()!==input.expectedUpdatedAt)
   return errorResponse('EDITION_REQUEST_INVALID',400);
 const {bookId}=await params;
 try{
   const result=await prisma.$transaction(async tx=>{
     const book=await tx.book.findFirst({
       where:{id:bookId,archivedAt:null,workspace:{memberships:{some:{
         userId:user.id,role:{in:['OWNER','EDITOR']}
       }}}},
       select:{id:true,workspaceId:true,updatedAt:true,editions:{
         orderBy:{number:'desc'},take:1,
         select:{id:true,number:true,language:true,
           manuscript:{select:{id:true,chapters:{
             where:{deletedAt:null},orderBy:[{position:'asc'},{id:'asc'}],
             select:{id:true,title:true,position:true}
           }}}
         }
       }}
     });
     if(!book)return {kind:'NOT_FOUND'} as const;
     const old=book.editions[0],chapters=old?.manuscript?.chapters;
     if(!old||!chapters)return {kind:'INTEGRITY'} as const;
     if(book.updatedAt.getTime()!==expected.getTime()||
        old.id!==input.expectedEditionId)
       return {kind:'CONFLICT'} as const;
     if(chapters.length>MAX_CHAPTERS||old.number>=10000)
       return {kind:'TOO_LARGE'} as const;
     const latest=await tx.$queryRaw<LastRevision[]>`
       SELECT DISTINCT ON (r.chapter_id)
         r.chapter_id::text AS "chapterId",r.content,r.text,
         r.content_hash AS "contentHash"
       FROM document_revisions r
       JOIN chapters c ON c.id=r.chapter_id
       WHERE c.manuscript_id=${old.manuscript.id}::uuid AND c.deleted_at IS NULL
       ORDER BY r.chapter_id,r.sequence DESC
     `;
     if(latest.length!==chapters.length)return {kind:'INTEGRITY'} as const;
     const byChapter=new Map(latest.map(item=>[item.chapterId,item]));
     let bytes=0;
     for(const chapter of chapters){
       const revision=byChapter.get(chapter.id);
       if(!revision||!revision.content||typeof revision.text!=='string'||
          !/^[a-f0-9]{64}$/i.test(revision.contentHash))
          return {kind:'INTEGRITY'} as const;
       bytes+=Buffer.byteLength(JSON.stringify(revision.content),'utf8')+
         Buffer.byteLength(revision.text,'utf8');
       if(bytes>MAX_COPY_BYTES)return {kind:'TOO_LARGE'} as const;
     }
     // Concurrency version on Book: no new edition on a stale manuscript selection.
     const changed=await tx.book.updateMany({
       where:{id:bookId,workspaceId:book.workspaceId,
         archivedAt:null,updatedAt:expected},
       data:{status:'DRAFT'}
     });
     if(changed.count!==1)throw new Error('EDITION_CONCURRENT_CHANGE');
     const created=await tx.edition.create({
       data:{bookId,number:old.number+1,language:old.language}
     });
     const manuscript=await tx.manuscript.create({data:{editionId:created.id}});
     const ids=new Map(chapters.map(chapter=>[chapter.id,randomUUID()]));
     if(chapters.length){
       await tx.chapter.createMany({data:chapters.map(chapter=>({
         id:ids.get(chapter.id)!,manuscriptId:manuscript.id,
         title:chapter.title,position:chapter.position,revisionSeq:0
       }))});
       await tx.documentRevision.createMany({data:chapters.map(chapter=>{
         const revision=byChapter.get(chapter.id)!;
         return {chapterId:ids.get(chapter.id)!,sequence:0,
           content:revision.content as Prisma.InputJsonValue,
           text:revision.text,contentHash:revision.contentHash,authorId:user.id};
       })});
     }
     await tx.auditEvent.create({data:{
       actorId:user.id,workspaceId:book.workspaceId,subjectId:bookId,
       action:'EDITION_CREATED',metadata:{
         previousEditionId:old.id,previousNumber:old.number,
         newEditionId:created.id,newNumber:created.number,
         copiedActiveChapters:chapters.length,mode:'COPY_LATEST_SAVED'
       }
     }});
     return {kind:'OK',edition:{id:created.id,number:created.number,
       language:created.language,chapterCount:chapters.length}} as const;
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:5000,timeout:20000});
   if(result.kind==='NOT_FOUND')return errorResponse('NOT_FOUND',404);
   if(result.kind==='CONFLICT')return errorResponse('EDITION_CONFLICT',409);
   if(result.kind==='TOO_LARGE')
     return errorResponse('EDITION_COPY_TOO_LARGE',422,
       {maxChapters:MAX_CHAPTERS,maxBytes:MAX_COPY_BYTES});
   if(result.kind==='INTEGRITY')return errorResponse('EDITION_SOURCE_INVALID',409);
   return Response.json({edition:result.edition},{status:201,headers});
 }catch(e){
   if((e instanceof Error&&e.message==='EDITION_CONCURRENT_CHANGE')||
      (e&&typeof e==='object'&&'code' in e&&
        (e.code==='P2034'||e.code==='P2002')))
     return errorResponse('EDITION_CONFLICT',409);
   return errorResponse('EDITION_CREATE_FAILED',503);
 }
}
