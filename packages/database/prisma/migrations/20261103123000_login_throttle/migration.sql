-- BS-003 / #4: distributed, privacy-preserving rate limiter for password login.
-- Reversible for dev only by DROP TABLE auth_throttles, never automatically in production.
CREATE TABLE "auth_throttles" (
  "key" CHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "window_start" TIMESTAMP(3) NOT NULL,
  "locked_until" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_throttles_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "auth_throttles_updated_at_idx" ON "auth_throttles"("updated_at");
