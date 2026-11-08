import {prisma} from '@bookstudio/database';
import {summarizeBookChapters,type ProgressSummary,type LatestChapterText}
  from './book-progress-summary';

export type BookProgress=ProgressSummary&{
 editionNumber:number|null;removedChapters:number;revisionRecords:number;
 snapshots:number;lastRevisionAt:string|null;
};

/**
 * Book-scoped read, reauthorizes the session at the DB level for every call.
 * Never returns manuscript text, version contents, storage paths or signed URLs.
 */
export async function getBookProgress(bookId:string,userId:string):Promise<BookProgress|null>{
 const book=await prisma.book.findFirst({
  where:{id:bookId,archivedAt:null,workspace:{memberships:{some:{userId}}}},
  select:{id:true,editions:{orderBy:{number:'desc'},take:1,select:{
   number:true,manuscript:{select:{id:true,chapters:{
    where:{deletedAt:null},orderBy:[{position:'asc'},{id:'asc'}],
    select:{id:true,title:true,revisionSeq:true,updatedAt:true}
   }}}
  }}}
 });
 if(!book)return null;
 const edition=book.editions[0],manuscript=edition?.manuscript;
 if(!manuscript){
   const snapshots=await prisma.bookSnapshot.count({where:{bookId}});
   return {...summarizeBookChapters([],[]),editionNumber:edition?.number??null,
     removedChapters:0,revisionRecords:0,snapshots,lastRevisionAt:null};
 }
 const manuscriptId=manuscript.id;
 const [latestTexts,revisionAggregate,removedChapters,snapshots]=await Promise.all([
   prisma.$queryRaw<LatestChapterText[]>`
     SELECT last.chapter_id::text AS "chapterId",
       (last.text ~ '[^[:space:]]') AS "hasText"
     FROM (
       SELECT DISTINCT ON (r.chapter_id) r.chapter_id,r.text
       FROM document_revisions r
       JOIN chapters c ON c.id=r.chapter_id
       WHERE c.manuscript_id=${manuscriptId}::uuid AND c.deleted_at IS NULL
       ORDER BY r.chapter_id,r.sequence DESC
     ) last
   `,
   prisma.documentRevision.aggregate({
     where:{chapter:{manuscriptId,deletedAt:null}},
     _count:{_all:true},_max:{createdAt:true}
   }),
   prisma.chapter.count({where:{manuscriptId,deletedAt:{not:null}}}),
   prisma.bookSnapshot.count({where:{bookId}})
 ]);
 return {...summarizeBookChapters(manuscript.chapters,latestTexts),
   editionNumber:edition.number,removedChapters,
   revisionRecords:revisionAggregate._count._all,snapshots,
   lastRevisionAt:revisionAggregate._max.createdAt?.toISOString()??null};
}
