-- ─────────────────────────────────────────────────────────────────────────────
-- Advanced Accounting — Phase 1 (GL) + Phase 2 (Tenant Ledger + Owners)
--
-- Adds the double-entry bookkeeping foundation so PropertyFlow can compete with
-- Buildium / AppFolio / Rentvine on real accounting (not just rollup analytics).
--
--   ChartOfAccount  →  JournalEntry  →  JournalLine  (debit/credit, balanced)
--   TenantLedgerEntry  →  per-tenant running balance
--   Owner  →  PropertyOwner  →  OwnerStatement  →  OwnerDistribution
--   AccountingAuditLog  →  who-did-what for every journal / statement change
--   FiscalPeriod  →  open / locked / closed periods
--
-- Gated by subscription tier (Pro and Enterprise only). Existing Expense /
-- RentPayment / MaintenanceTicket tables are unchanged so the Starter tier
-- rollup analytics keeps working without a backfill.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums
CREATE TYPE "AccountType" AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
CREATE TYPE "LedgerEntryType" AS ENUM (
  'charge', 'payment', 'late_fee', 'credit', 'refund', 'adjustment', 'deposit', 'deposit_refund'
);

-- ChartOfAccount
CREATE TABLE "ChartOfAccount" (
  "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId"  UUID         NULL,
  "code"        TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "type"        "AccountType" NOT NULL,
  "subType"     TEXT         NULL,
  "parentId"    UUID         NULL,
  "isSystem"    BOOLEAN      NOT NULL DEFAULT false,
  "isActive"    BOOLEAN      NOT NULL DEFAULT true,
  "taxLine"     TEXT         NULL,
  "description" TEXT         NULL,
  "createdAt"   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChartOfAccount_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "ChartOfAccount_landlordId_code_key" ON "ChartOfAccount"("landlordId", "code");
CREATE INDEX "ChartOfAccount_landlordId_type_idx" ON "ChartOfAccount"("landlordId", "type");
CREATE INDEX "ChartOfAccount_landlordId_isActive_idx" ON "ChartOfAccount"("landlordId", "isActive");
CREATE INDEX "ChartOfAccount_parentId_idx" ON "ChartOfAccount"("parentId");

-- FiscalPeriod
CREATE TABLE "FiscalPeriod" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId" UUID         NOT NULL,
  "startDate"  TIMESTAMP(6) NOT NULL,
  "endDate"    TIMESTAMP(6) NOT NULL,
  "status"     TEXT         NOT NULL DEFAULT 'open',
  "closedAt"   TIMESTAMP(6) NULL,
  "closedBy"   UUID         NULL,
  "createdAt"  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "FiscalPeriod_landlordId_startDate_key" ON "FiscalPeriod"("landlordId", "startDate");
CREATE INDEX "FiscalPeriod_landlordId_status_idx" ON "FiscalPeriod"("landlordId", "status");

-- JournalEntry
CREATE TABLE "JournalEntry" (
  "id"            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId"    UUID         NOT NULL,
  "periodId"      UUID         NULL,
  "postedAt"      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveDate" TIMESTAMP(6) NOT NULL,
  "memo"          TEXT         NULL,
  "source"        TEXT         NOT NULL,
  "sourceId"      TEXT         NULL,
  "isReversing"   BOOLEAN      NOT NULL DEFAULT false,
  "reversedById"  UUID         NULL,
  "createdBy"     UUID         NULL,
  "createdAt"     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEntry_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "FiscalPeriod"("id") ON DELETE SET NULL
);
CREATE INDEX "JournalEntry_landlordId_effectiveDate_idx" ON "JournalEntry"("landlordId", "effectiveDate");
CREATE INDEX "JournalEntry_landlordId_postedAt_idx" ON "JournalEntry"("landlordId", "postedAt");
CREATE INDEX "JournalEntry_source_sourceId_idx" ON "JournalEntry"("source", "sourceId");
CREATE INDEX "JournalEntry_periodId_idx" ON "JournalEntry"("periodId");

-- JournalLine
CREATE TABLE "JournalLine" (
  "id"         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "entryId"    UUID            NOT NULL,
  "accountId"  UUID            NOT NULL,
  "debit"      DECIMAL(14, 2)  NOT NULL DEFAULT 0,
  "credit"     DECIMAL(14, 2)  NOT NULL DEFAULT 0,
  "propertyId" UUID            NULL,
  "unitId"     UUID            NULL,
  "tenantId"   UUID            NULL,
  "ownerId"    UUID            NULL,
  "memo"       TEXT            NULL,
  "createdAt"  TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalLine_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE,
  CONSTRAINT "JournalLine_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT
);
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");
CREATE INDEX "JournalLine_entryId_idx" ON "JournalLine"("entryId");
CREATE INDEX "JournalLine_propertyId_idx" ON "JournalLine"("propertyId");
CREATE INDEX "JournalLine_unitId_idx" ON "JournalLine"("unitId");
CREATE INDEX "JournalLine_tenantId_idx" ON "JournalLine"("tenantId");
CREATE INDEX "JournalLine_ownerId_idx" ON "JournalLine"("ownerId");

-- AccountingAuditLog
CREATE TABLE "AccountingAuditLog" (
  "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId" UUID         NOT NULL,
  "userId"     UUID         NULL,
  "action"     TEXT         NOT NULL,
  "entityType" TEXT         NOT NULL,
  "entityId"   UUID         NOT NULL,
  "changes"    JSON         NULL,
  "ip"         TEXT         NULL,
  "userAgent"  TEXT         NULL,
  "createdAt"  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AccountingAuditLog_landlordId_createdAt_idx" ON "AccountingAuditLog"("landlordId", "createdAt");
CREATE INDEX "AccountingAuditLog_entityType_entityId_idx" ON "AccountingAuditLog"("entityType", "entityId");
CREATE INDEX "AccountingAuditLog_userId_createdAt_idx" ON "AccountingAuditLog"("userId", "createdAt");

-- TenantLedgerEntry
CREATE TABLE "TenantLedgerEntry" (
  "id"             UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId"     UUID                NOT NULL,
  "tenantId"       UUID                NOT NULL,
  "leaseId"        UUID                NOT NULL,
  "propertyId"     UUID                NOT NULL,
  "unitId"         UUID                NOT NULL,
  "type"           "LedgerEntryType"   NOT NULL,
  "amount"         DECIMAL(12, 2)      NOT NULL,
  "runningBalance" DECIMAL(14, 2)      NOT NULL,
  "effectiveDate"  TIMESTAMP(6)        NOT NULL,
  "postedAt"       TIMESTAMP(6)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description"    TEXT                NULL,
  "rentPaymentId"  UUID                NULL,
  "journalEntryId" UUID                NULL,
  CONSTRAINT "TenantLedgerEntry_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "TenantLedgerEntry_rentPaymentId_fkey"
    FOREIGN KEY ("rentPaymentId") REFERENCES "RentPayment"("id") ON DELETE SET NULL
);
CREATE INDEX "TenantLedgerEntry_landlordId_postedAt_idx" ON "TenantLedgerEntry"("landlordId", "postedAt");
CREATE INDEX "TenantLedgerEntry_tenantId_postedAt_idx" ON "TenantLedgerEntry"("tenantId", "postedAt");
CREATE INDEX "TenantLedgerEntry_leaseId_postedAt_idx" ON "TenantLedgerEntry"("leaseId", "postedAt");
CREATE INDEX "TenantLedgerEntry_propertyId_postedAt_idx" ON "TenantLedgerEntry"("propertyId", "postedAt");
CREATE INDEX "TenantLedgerEntry_rentPaymentId_idx" ON "TenantLedgerEntry"("rentPaymentId");

-- Owner
CREATE TABLE "Owner" (
  "id"           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId"   UUID            NOT NULL,
  "userId"       UUID            NULL,
  "name"         TEXT            NOT NULL,
  "email"        TEXT            NULL,
  "phone"        TEXT            NULL,
  "taxId"        TEXT            NULL,
  "address"      TEXT            NULL,
  "payoutMethod" TEXT            NOT NULL DEFAULT 'ach',
  "payoutSplit"  DECIMAL(5, 2)   NOT NULL DEFAULT 100.00,
  "isActive"     BOOLEAN         NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Owner_landlordId_fkey"
    FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE,
  CONSTRAINT "Owner_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX "Owner_landlordId_isActive_idx" ON "Owner"("landlordId", "isActive");
CREATE INDEX "Owner_landlordId_email_idx" ON "Owner"("landlordId", "email");
CREATE INDEX "Owner_userId_idx" ON "Owner"("userId");

-- PropertyOwner
CREATE TABLE "PropertyOwner" (
  "propertyId"     UUID          NOT NULL,
  "ownerId"        UUID          NOT NULL,
  "ownershipPct"   DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
  "effectiveFrom"  TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertyOwner_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE,
  CONSTRAINT "PropertyOwner_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE,
  PRIMARY KEY ("propertyId", "ownerId", "effectiveFrom")
);
CREATE INDEX "PropertyOwner_ownerId_idx" ON "PropertyOwner"("ownerId");

-- OwnerStatement
CREATE TABLE "OwnerStatement" (
  "id"               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId"       UUID            NOT NULL,
  "ownerId"          UUID            NOT NULL,
  "periodStart"      TIMESTAMP(6)    NOT NULL,
  "periodEnd"        TIMESTAMP(6)    NOT NULL,
  "totalIncome"      DECIMAL(14, 2)  NOT NULL,
  "totalExpense"     DECIMAL(14, 2)  NOT NULL,
  "netIncome"        DECIMAL(14, 2)  NOT NULL,
  "managementFeePct" DECIMAL(5, 2)   NOT NULL,
  "managementFee"    DECIMAL(14, 2)  NOT NULL,
  "distribution"     DECIMAL(14, 2)  NOT NULL,
  "status"           TEXT            NOT NULL DEFAULT 'draft',
  "pdfUrl"           TEXT            NULL,
  "emailSentAt"      TIMESTAMP(6)    NULL,
  "emailRecipients"  TEXT[]          NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes"            TEXT            NULL,
  "generatedAt"      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedBy"      UUID            NULL,
  "finalizedAt"      TIMESTAMP(6)    NULL,
  CONSTRAINT "OwnerStatement_landlordId_fkey"
    FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE,
  CONSTRAINT "OwnerStatement_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "OwnerStatement_ownerId_periodStart_periodEnd_key"
  ON "OwnerStatement"("ownerId", "periodStart", "periodEnd");
CREATE INDEX "OwnerStatement_landlordId_periodStart_idx" ON "OwnerStatement"("landlordId", "periodStart");
CREATE INDEX "OwnerStatement_status_idx" ON "OwnerStatement"("status");

-- OwnerDistribution
CREATE TABLE "OwnerDistribution" (
  "id"               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId"          UUID            NOT NULL,
  "statementId"      UUID            NULL,
  "amount"           DECIMAL(14, 2)  NOT NULL,
  "method"           TEXT            NOT NULL DEFAULT 'ach',
  "status"           TEXT            NOT NULL DEFAULT 'pending',
  "scheduledFor"     TIMESTAMP(6)    NOT NULL,
  "paidAt"           TIMESTAMP(6)    NULL,
  "stripeTransferId" TEXT            NULL,
  "notes"            TEXT            NULL,
  "createdAt"        TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerDistribution_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE,
  CONSTRAINT "OwnerDistribution_statementId_fkey"
    FOREIGN KEY ("statementId") REFERENCES "OwnerStatement"("id") ON DELETE SET NULL
);
CREATE INDEX "OwnerDistribution_ownerId_status_idx" ON "OwnerDistribution"("ownerId", "status");
CREATE INDEX "OwnerDistribution_statementId_idx" ON "OwnerDistribution"("statementId");
CREATE INDEX "OwnerDistribution_scheduledFor_status_idx" ON "OwnerDistribution"("scheduledFor", "status");
