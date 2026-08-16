-- Advanced Accounting Phase 3 — Bank Reconciliation
-- Adds the BankTransaction model + the enums it depends on.
-- All money amounts are in dollars (not cents); source.sign = direction.

-- CreateEnum
CREATE TYPE "BankTransactionSource" AS ENUM (
  'stripe_charge',
  'stripe_payout',
  'stripe_transfer',
  'stripe_outbound_xfer',
  'stripe_inbound_xfer',
  'stripe_application_fee',
  'csv'
);

-- CreateEnum
CREATE TYPE "BankTransactionStatus" AS ENUM (
  'unmatched',
  'matched',
  'ignored',
  'needs_review'
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "financialAccountId" UUID,
    "stripeConnectedAccountId" VARCHAR(255),
    "source" "BankTransactionSource" NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "stripeEventId" VARCHAR(255),
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "description" TEXT,
    "rawPayload" JSONB,
    "postedAt" TIMESTAMP(6) NOT NULL,
    "status" "BankTransactionStatus" NOT NULL DEFAULT 'unmatched',
    "matchedJournalEntryId" UUID,
    "matchedAt" TIMESTAMP(6),
    "matchedBy" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique per landlord — webhook retries are idempotent)
CREATE UNIQUE INDEX "BankTransaction_landlordId_externalId_key"
  ON "BankTransaction"("landlordId", "externalId");

-- CreateIndex (1:1 back-relation to JournalEntry)
CREATE UNIQUE INDEX "BankTransaction_matchedJournalEntryId_key"
  ON "BankTransaction"("matchedJournalEntryId");

-- CreateIndex (lookup by event id for webhook log reconciliation)
CREATE INDEX "BankTransaction_stripeEventId_idx"
  ON "BankTransaction"("stripeEventId");

-- CreateIndex (date-range scans for the reconciliation screen)
CREATE INDEX "BankTransaction_landlordId_postedAt_idx"
  ON "BankTransaction"("landlordId", "postedAt" DESC);

-- CreateIndex (filter by status — "show me unmatched")
CREATE INDEX "BankTransaction_landlordId_status_idx"
  ON "BankTransaction"("landlordId", "status");

-- CreateIndex (filter by source — "show me Stripe payouts")
CREATE INDEX "BankTransaction_landlordId_source_idx"
  ON "BankTransaction"("landlordId", "source");

-- AddForeignKey (Landlord → BankTransaction, cascade on landlord delete)
ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_landlordId_fkey"
  FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (FinancialAccount → BankTransaction, null on FA delete)
ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_financialAccountId_fkey"
  FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (JournalEntry → BankTransaction, null on entry delete so
-- reversing a journal entry doesn't leave a phantom matched bank row)
ALTER TABLE "BankTransaction"
  ADD CONSTRAINT "BankTransaction_matchedJournalEntryId_fkey"
  FOREIGN KEY ("matchedJournalEntryId") REFERENCES "JournalEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
