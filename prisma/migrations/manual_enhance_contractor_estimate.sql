-- Migration: Enhance ContractorEstimate for standalone contractor use
-- This is an ADDITIVE migration only. No columns are removed, no data is lost.
-- Safe to run against production.
--
-- Run with: psql $DATABASE_URL -f prisma/migrations/manual_enhance_contractor_estimate.sql
-- Or via Supabase SQL editor.

-- 1. Make contractorId optional (was required, now nullable for standalone mode)
ALTER TABLE "ContractorEstimate" ALTER COLUMN "contractorId" DROP NOT NULL;

-- 2. Add contractorProfileId (standalone contractor identity)
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "contractorProfileId" UUID;

-- 3. Add customerId (links to ContractorCustomer)
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "customerId" UUID;

-- 4. Add estimateNumber (human-readable)
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "estimateNumber" TEXT;

-- 5. Add trade and category
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "trade" TEXT;
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- 6. Add pricing modifiers
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "markup" DECIMAL(5,2) DEFAULT 0;
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(5,2) DEFAULT 0;

-- 7. Add tiers JSON (Good/Better/Best)
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "tiers" JSON;

-- 8. Add measurements JSON (Google Solar / manual)
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "measurements" JSON;

-- 9. Add photos array
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT '{}';

-- 10. Add customer-facing notes and terms
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "customerNotes" TEXT;
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "termsConditions" TEXT;

-- 11. Add extended tracking timestamps
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(6);
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "declinedAt" TIMESTAMP(6);
ALTER TABLE "ContractorEstimate" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(6);

-- 12. Add foreign key constraints
ALTER TABLE "ContractorEstimate"
  ADD CONSTRAINT "ContractorEstimate_contractorProfileId_fkey"
  FOREIGN KEY ("contractorProfileId") REFERENCES "ContractorProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractorEstimate"
  ADD CONSTRAINT "ContractorEstimate_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "ContractorCustomer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 13. Add indexes for new columns
CREATE INDEX IF NOT EXISTS "ContractorEstimate_contractorProfileId_idx" ON "ContractorEstimate"("contractorProfileId");
CREATE INDEX IF NOT EXISTS "ContractorEstimate_customerId_idx" ON "ContractorEstimate"("customerId");
CREATE INDEX IF NOT EXISTS "ContractorEstimate_trade_idx" ON "ContractorEstimate"("trade");

-- 14. Update existing contractorId constraint to allow NULL
-- (The ALTER COLUMN DROP NOT NULL above handles this)

-- Done! The ContractorEstimate table now supports:
-- - Standalone contractor use (via contractorProfileId + customerId)
-- - PM-side use (via contractorId + landlordId, legacy)
-- - Trade-specific workflows (trade, measurements)
-- - Tiered pricing (tiers JSON)
-- - Full pricing with markup/discount/tax
-- - Photo attachments
-- - Customer-facing notes and terms
-- - Extended lifecycle tracking (accepted/declined/converted timestamps)
