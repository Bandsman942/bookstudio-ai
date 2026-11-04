ALTER TYPE "SourceScanStatus" ADD VALUE IF NOT EXISTS 'SCAN_PENDING_PROMOTION';
ALTER TABLE "source_scan_jobs"
  ADD COLUMN "lease_token_hash" CHAR(64),
  ADD COLUMN "attestation_nonce_hash" CHAR(64),
  ADD COLUMN "attestation_hash" CHAR(64),
  ADD COLUMN "result_status" VARCHAR(35),
  ADD COLUMN "result_sha256" CHAR(64),
  ADD COLUMN "scanner_version" VARCHAR(100),
  ADD COLUMN "scanned_at" TIMESTAMP(3),
  ADD COLUMN "finished_at" TIMESTAMP(3);
