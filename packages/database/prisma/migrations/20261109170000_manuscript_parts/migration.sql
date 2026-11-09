-- Additive, nullable grouping metadata; existing chapter order and revisions
-- are unchanged. Part membership must match the manuscript in the API.
CREATE TABLE "manuscript_parts" (
  "id" UUID NOT NULL,
  "manuscript_id" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "manuscript_parts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "manuscript_parts_manuscript_id_idx" ON "manuscript_parts"("manuscript_id");
CREATE UNIQUE INDEX "manuscript_parts_id_manuscript_id_key" ON "manuscript_parts"("id","manuscript_id");
ALTER TABLE "manuscript_parts" ADD CONSTRAINT "manuscript_parts_manuscript_id_fkey"
  FOREIGN KEY ("manuscript_id") REFERENCES "manuscripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapters" ADD COLUMN "part_id" UUID;
CREATE INDEX "chapters_manuscript_id_part_id_idx" ON "chapters"("manuscript_id","part_id");
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_part_id_fkey"
  FOREIGN KEY ("part_id","manuscript_id") REFERENCES "manuscript_parts"("id","manuscript_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
