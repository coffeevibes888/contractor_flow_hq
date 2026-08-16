-- Enrich FreeLeaseUsage with lead capture fields
ALTER TABLE "FreeLeaseUsage"
  ADD COLUMN IF NOT EXISTS "landlordName"    TEXT,
  ADD COLUMN IF NOT EXISTS "propertyType"    TEXT,
  ADD COLUMN IF NOT EXISTS "propertyAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "monthlyRent"     DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "utmSource"       TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium"       TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign"     TEXT,
  ADD COLUMN IF NOT EXISTS "referrer"        TEXT,
  ADD COLUMN IF NOT EXISTS "converted"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "convertedAt"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "notes"           TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS "FreeLeaseUsage_converted_idx" ON "FreeLeaseUsage"("converted");
CREATE INDEX IF NOT EXISTS "FreeLeaseUsage_state_idx"     ON "FreeLeaseUsage"("state");
CREATE INDEX IF NOT EXISTS "FreeLeaseUsage_createdAt_idx" ON "FreeLeaseUsage"("createdAt");
