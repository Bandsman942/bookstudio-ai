import {Prisma} from '@prisma/client';
import { prisma } from '@bookstudio/database';
import { activeUser } from '@/lib/auth';
import { errorResponse } from '@/lib/security';
import {parseSearchParams,escapeLikeLiteral,SEARCH_PAGE_SIZE,SearchQueryError}
 from '@/lib/search-paging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchHit={
  bookId:string;bookTitle:string;chapterId:string;chapterTitle:string;
  revision:number;snippet:string;updatedAt:Date
};

/** Only the CURRENT saved revision of CURRENT editions in workspaces
 * accessible to this user. Book scope is checked before searching text.
 * Query is parameterized, offsets bounded and results explicitly paginated.
 * This endpoint neither mutates manuscripts nor sends prose to any AI. */
export async function GET(request:Request){
  const user=await activeUser();
  if(!user)return errorResponse('UNAUTHENTICATED',401);
  let q:string,bookId:string|null,offset:number;
  try{({q,bookId,offset}=parseSearchParams(
    new URL(request.url).searchParams));}
  catch(error){
    if(error instanceof SearchQueryError)
      return errorResponse('SEARCH_QUERY_INVALID',400);
    return errorResponse('SEARCH_QUERY_INVALID',400);
  }
  try{
    // Permission check is mandatory for a scoped request even when there
    // are no matching chapters. Otherwise an inaccessible book could be
    // inferred from differences in empty results.
    let scopeTitle:string|null=null;
    if(bookId){
      const allowed=await prisma.book.findFirst({
        where:{id:bookId,archivedAt:null,
          workspace:{memberships:{some:{userId:user.id}}}},
        select:{title:true}
      });
      if(!allowed)return errorResponse('NOT_FOUND',404);
      scopeTitle=allowed.title;
    }
    const pattern=escapeLikeLiteral(q);
    const scope=bookId?Prisma.sql`AND b.id=${bookId}::uuid`:Prisma.empty;
    const rows=await prisma.$queryRaw<SearchHit[]>(Prisma.sql`
      SELECT b.id AS "bookId",
             b.title AS "bookTitle",
             c.id AS "chapterId",
             c.title AS "chapterTitle",
             c.revision_seq AS "revision",
             substring(r.text FROM greatest(1,
               strpos(lower(r.text),lower(${q}))-70) FOR 220) AS "snippet",
             b.updated_at AS "updatedAt"
      FROM document_revisions AS r
      INNER JOIN chapters AS c
        ON c.id=r.chapter_id AND c.revision_seq=r.sequence
      INNER JOIN manuscripts AS m ON m.id=c.manuscript_id
      INNER JOIN editions AS e ON e.id=m.edition_id
      INNER JOIN books AS b ON b.id=e.book_id AND b.archived_at IS NULL
      WHERE EXISTS (
        SELECT 1 FROM memberships AS membership
        WHERE membership.workspace_id=b.workspace_id
          AND membership.user_id=${user.id}::uuid
      )
      AND c.deleted_at IS NULL
      AND e.number=(
        SELECT max(e2.number) FROM editions AS e2 WHERE e2.book_id=b.id
      )
      AND r.text ILIKE ${pattern}
      ${scope}
      ORDER BY b.updated_at DESC,b.id ASC,c.position ASC,c.id ASC
      LIMIT ${SEARCH_PAGE_SIZE+1} OFFSET ${offset}
    `);
    const hasMore=rows.length>SEARCH_PAGE_SIZE;
    const hits=rows.slice(0,SEARCH_PAGE_SIZE);
    return Response.json({
      query:q,bookId,bookTitle:scopeTitle,
      hits,offset,pageSize:SEARCH_PAGE_SIZE,
      nextOffset:hasMore?offset+SEARCH_PAGE_SIZE:null,hasMore,
      limitedTo:SEARCH_PAGE_SIZE,
      scope:bookId?'saved-current-book-revisions':'saved-current-revisions'
    },{headers:{'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff'}});
  }catch{
    return errorResponse('SEARCH_TEMPORARILY_UNAVAILABLE',503);
  }
}
