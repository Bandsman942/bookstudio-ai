-- Durable scan intents, not malware clearance. Source confirmations rotate generations.
CREATE TYPE "SourceScanJobStatus" AS ENUM ('QUEUED','LEASED','FINISHED','FAILED','CANCELLED');
ALTER TABLE "source_security_records" ADD COLUMN "source_generation" UUID NOT NULL DEFAULT gen_random_uuid();
CREATE TABLE "source_scan_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "book_id" UUID NOT NULL,
  "storage_name" VARCHAR(140) NOT NULL,
  "source_generation" UUID NOT NULL,
  "declared_byte_size" INTEGER NOT NULL,
  "declared_media_type" VARCHAR(160) NOT NULL,
  "status" "SourceScanJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lease_expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_scan_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "source_scan_jobs_book_id_fkey" FOREIGN KEY ("book_id")
    REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "source_scan_jobs_positive_size_check" CHECK ("declared_byte_size" BETWEEN 1 AND 20971520),
  CONSTRAINT "source_scan_jobs_attempts_check" CHECK ("attempts" BETWEEN 0 AND 3)
);
CREATE UNIQUE INDEX "source_scan_jobs_book_id_storage_name_source_generation_key"
  ON "source_scan_jobs"("book_id","storage_name","source_generation");
CREATE INDEX "source_scan_jobs_status_created_at_idx" ON "source_scan_jobs"("status","created_at");
CREATE INDEX "source_scan_jobs_book_id_created_at_idx" ON "source_scan_jobs"("book_id","created_at");
