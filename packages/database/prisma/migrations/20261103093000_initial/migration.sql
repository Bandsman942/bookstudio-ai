
-- BookStudio AI independent Neon schema; never run against DTSC Platform.
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','DISABLED');
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER','EDITOR','REVIEWER','VIEWER');
CREATE TYPE "BookStatus" AS ENUM ('DRAFT','WRITING','REVIEW','APPROVED','PRODUCTION','PUBLISHED','ARCHIVED');
CREATE TABLE "users" (
 "id" UUID NOT NULL PRIMARY KEY, "email" VARCHAR(320) NOT NULL UNIQUE,
 "name" VARCHAR(140) NOT NULL, "password_hash" TEXT NOT NULL,
 "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "sessions" (
 "id" UUID NOT NULL PRIMARY KEY, "user_id" UUID NOT NULL,
 "token_hash" CHAR(64) NOT NULL UNIQUE,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expires_at" TIMESTAMP(3) NOT NULL, "revoked_at" TIMESTAMP(3)
);
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id","expires_at");
CREATE TABLE "workspaces" (
 "id" UUID NOT NULL PRIMARY KEY,"owner_id" UUID NOT NULL,"name" VARCHAR(140) NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "memberships" (
 "id" UUID NOT NULL PRIMARY KEY,"workspace_id" UUID NOT NULL,"user_id" UUID NOT NULL,
 "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "memberships_workspace_id_user_id_key" ON "memberships"("workspace_id","user_id");
CREATE TABLE "books" (
 "id" UUID NOT NULL PRIMARY KEY,"workspace_id" UUID NOT NULL,"owner_id" UUID NOT NULL,
 "title" VARCHAR(180) NOT NULL,"book_type" VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
 "language" VARCHAR(10) NOT NULL DEFAULT 'fr',"status" "BookStatus" NOT NULL DEFAULT 'DRAFT',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,"archived_at" TIMESTAMP(3)
);
CREATE INDEX "books_workspace_id_updated_at_idx" ON "books"("workspace_id","updated_at");
CREATE TABLE "editions" (
 "id" UUID NOT NULL PRIMARY KEY,"book_id" UUID NOT NULL,"number" INTEGER NOT NULL DEFAULT 1,
 "language" VARCHAR(10) NOT NULL DEFAULT 'fr'
);
CREATE UNIQUE INDEX "editions_book_id_number_key" ON "editions"("book_id","number");
CREATE TABLE "manuscripts" ("id" UUID NOT NULL PRIMARY KEY,"edition_id" UUID NOT NULL UNIQUE);
CREATE TABLE "chapters" (
 "id" UUID NOT NULL PRIMARY KEY,"manuscript_id" UUID NOT NULL,
 "title" VARCHAR(180) NOT NULL,"position" INTEGER NOT NULL DEFAULT 0,
 "revision_seq" INTEGER NOT NULL DEFAULT 0,"updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "chapters_manuscript_id_position_key" ON "chapters"("manuscript_id","position");
CREATE INDEX "chapters_manuscript_id_position_idx" ON "chapters"("manuscript_id","position");
CREATE TABLE "document_revisions" (
 "id" UUID NOT NULL PRIMARY KEY,"chapter_id" UUID NOT NULL,"sequence" INTEGER NOT NULL,
 "content" JSONB NOT NULL,"text" TEXT NOT NULL,"content_hash" CHAR(64) NOT NULL,
 "author_id" UUID NOT NULL,"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "document_revisions_chapter_id_sequence_key" ON "document_revisions"("chapter_id","sequence");
CREATE INDEX "document_revisions_chapter_id_created_at_idx" ON "document_revisions"("chapter_id","created_at");
CREATE TABLE "book_snapshots" (
 "id" UUID NOT NULL PRIMARY KEY,"book_id" UUID NOT NULL,"name" VARCHAR(140) NOT NULL,
 "revision_manifest" JSONB NOT NULL,"content_hash" CHAR(64) NOT NULL,"author_id" UUID NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "book_snapshots_book_id_created_at_idx" ON "book_snapshots"("book_id","created_at");
CREATE TABLE "audit_events" (
 "id" UUID NOT NULL PRIMARY KEY,"actor_id" UUID,"workspace_id" UUID,"subject_id" UUID,
 "action" VARCHAR(100) NOT NULL,"metadata" JSONB,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_events_workspace_id_created_at_idx" ON "audit_events"("workspace_id","created_at");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "editions" ADD CONSTRAINT "editions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_manuscript_id_fkey" FOREIGN KEY ("manuscript_id") REFERENCES "manuscripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_snapshots" ADD CONSTRAINT "book_snapshots_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_snapshots" ADD CONSTRAINT "book_snapshots_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
