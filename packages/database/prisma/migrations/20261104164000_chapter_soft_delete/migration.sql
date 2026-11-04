-- Chapter deletion is reversible and preserves revision/comment/snapshot ancestry.
ALTER TABLE "chapters" ADD COLUMN "deleted_at" TIMESTAMP(3);
CREATE INDEX "chapters_manuscript_id_deleted_at_position_idx" ON "chapters"("manuscript_id","deleted_at","position");
