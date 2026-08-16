-- ============================================================================
-- Manual migration: add Document model + receipt fields on Expense.
--
-- Apply with:
--   psql $DATABASE_URL -f prisma/manual-migrations/add-document-and-receipt-fields.sql
--
-- Or run statements individually in your Neon/Postgres console.
-- ============================================================================

-- 1. Document table — unified library for leases, receipts, insurance, etc.
CREATE TABLE IF NOT EXISTS "Document" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "landlordId"     UUID NOT NULL,
  "name"           TEXT NOT NULL,
  "category"       TEXT NOT NULL,
  "fileUrl"        TEXT NOT NULL,
  "mimeType"       TEXT,
  "sizeBytes"      INTEGER,
  "relatedToType"  TEXT,
  "relatedToId"    UUID,
  "notes"          TEXT,
  "uploadedById"   UUID,
  "createdAt"      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Document_landlord_fk"
    FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Document_landlordId_idx"   ON "Document"("landlordId");
CREATE INDEX IF NOT EXISTS "Document_category_idx"     ON "Document"("category");
CREATE INDEX IF NOT EXISTS "Document_relatedTo_idx"    ON "Document"("relatedToType", "relatedToId");
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx"    ON "Document"("createdAt");

-- 2. Receipt scanning fields on Expense
ALTER TABLE "Expense"
  ADD COLUMN IF NOT EXISTS "receiptUrl"     TEXT,
  ADD COLUMN IF NOT EXISTS "receiptOcrData" JSONB,
  ADD COLUMN IF NOT EXISTS "vendor"         TEXT;
