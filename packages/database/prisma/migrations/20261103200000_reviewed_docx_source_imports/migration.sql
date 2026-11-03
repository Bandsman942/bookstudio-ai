-- BS-006b additive, no existing document is overwritten.
CREATE TABLE "manuscript_source_imports" (
 "id" UUID NOT NULL,
 "book_id" UUID NOT NULL,
 "chapter_id" UUID NOT NULL,
 "operation_id" UUID NOT NULL,
 "source_name" VARCHAR(140) NOT NULL,
 "request_hash" CHAR(64) NOT NULL,
 "actor_id" UUID NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "manuscript_source_imports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "manuscript_source_imports_chapter_id_key" ON "manuscript_source_imports"("chapter_id");
CREATE UNIQUE INDEX "manuscript_source_imports_book_id_operation_id_key" ON "manuscript_source_imports"("book_id","operation_id");
CREATE INDEX "manuscript_source_imports_book_id_created_at_idx" ON "manuscript_source_imports"("book_id","created_at");
ALTER TABLE "manuscript_source_imports" ADD CONSTRAINT "manuscript_source_imports_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manuscript_source_imports" ADD CONSTRAINT "manuscript_source_imports_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manuscript_source_imports" ADD CONSTRAINT "manuscript_source_imports_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
