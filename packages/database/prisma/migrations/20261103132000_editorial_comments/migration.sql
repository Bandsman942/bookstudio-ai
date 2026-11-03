-- BS-010b: reviewable revision-anchored editorial comments (additive).
CREATE TYPE "EditorialCommentStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "editorial_comments" (
  "id" UUID NOT NULL,
  "chapter_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "base_revision" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "quote" VARCHAR(500),
  "start_offset" INTEGER,
  "end_offset" INTEGER,
  "status" "EditorialCommentStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "editorial_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "editorial_comments_chapter_id_created_at_idx" ON "editorial_comments"("chapter_id","created_at");
CREATE INDEX "editorial_comments_author_id_created_at_idx" ON "editorial_comments"("author_id","created_at");
ALTER TABLE "editorial_comments" ADD CONSTRAINT "editorial_comments_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "editorial_comments" ADD CONSTRAINT "editorial_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
