-- BS-010a1: status provenance only. No scanner is active.
-- New and legacy source objects are UNSCANNED unless future *trusted* evidence says otherwise.
CREATE TYPE "SourceScanStatus" AS ENUM
  ('UNSCANNED','QUEUED','SCANNING','SCANNED_CLEAN','REJECTED','SCAN_UNAVAILABLE');
CREATE TABLE "source_security_records" (
 "id" UUID NOT NULL,
 "book_id" UUID NOT NULL,
 "storage_name" VARCHAR(140) NOT NULL,
 "byte_size" INTEGER NOT NULL,
 "media_type" VARCHAR(160) NOT NULL,
 "confirmed_by_id" UUID NOT NULL,
 "status" "SourceScanStatus" NOT NULL DEFAULT 'UNSCANNED',
 "sha256" CHAR(64),
 "scanner_version" VARCHAR(100),
 "scanned_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "source_security_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "source_security_records_book_id_storage_name_key"
 ON "source_security_records"("book_id","storage_name");
CREATE INDEX "source_security_records_book_id_status_idx"
 ON "source_security_records"("book_id","status");
ALTER TABLE "source_security_records" ADD CONSTRAINT "source_security_records_book_id_fkey"
 FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "source_security_records" ADD CONSTRAINT "source_security_records_confirmed_by_id_fkey"
 FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
