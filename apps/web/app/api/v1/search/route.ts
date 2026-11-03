import { prisma } from '@bookstudio/database';
import { activeUser } from '@/lib/auth';
import { errorResponse } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchHit = {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  revision: number;
  snippet: string;
  updatedAt: Date;
};

/**
 * Only saved CURRENT revisions of accessible books can appear here.
 * Do not return historical content, inaccessible workspaces or archived books.
 * Search input is parameterized; SQL LIKE meta-characters are escaped literally.
 */
export async function GET(request: Request) {
  const user = await activeUser();
  if (!user) return errorResponse('UNAUTHENTICATED', 401);
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 80 || /[\u0000-\u001f\u007f]/.test(q)) {
    return errorResponse('SEARCH_QUERY_INVALID', 400);
  }
  const pattern = '%' + q.replace(/[\\%_]/g, character => '\\' + character) + '%';
  try {
    const hits = await prisma.$queryRaw<SearchHit[]>`
      SELECT b.id AS "bookId",
             b.title AS "bookTitle",
             c.id AS "chapterId",
             c.title AS "chapterTitle",
             c.revision_seq AS "revision",
             substring(r.text FROM greatest(1, strpos(lower(r.text), lower(${q})) - 70) FOR 220) AS "snippet",
             b.updated_at AS "updatedAt"
      FROM document_revisions AS r
      INNER JOIN chapters AS c ON c.id = r.chapter_id AND c.revision_seq = r.sequence
      INNER JOIN manuscripts AS m ON m.id = c.manuscript_id
      INNER JOIN editions AS e ON e.id = m.edition_id
      INNER JOIN books AS b ON b.id = e.book_id AND b.archived_at IS NULL
      WHERE EXISTS (
        SELECT 1 FROM memberships AS membership
        WHERE membership.workspace_id = b.workspace_id
          AND membership.user_id = ${user.id}::uuid
      )
      AND e.number = (SELECT max(e2.number) FROM editions AS e2 WHERE e2.book_id = b.id)
      AND r.text ILIKE ${pattern}
      ORDER BY b.updated_at DESC, c.position ASC
      LIMIT 30
    `;
    return Response.json({ query: q, hits, limitedTo: 30, scope: 'saved-current-revisions' }, {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return errorResponse('SEARCH_TEMPORARILY_UNAVAILABLE', 503);
  }
}
