-- Add enhanced fields to MaintenanceTicket that were in the schema
-- but missing from the database (never migrated).

ALTER TABLE "MaintenanceTicket"
  ADD COLUMN IF NOT EXISTS "location"                 TEXT,
  ADD COLUMN IF NOT EXISTS "attachments"              JSON,
  ADD COLUMN IF NOT EXISTS "accessSchedule"           JSON,
  ADD COLUMN IF NOT EXISTS "accessNotes"              TEXT,
  ADD COLUMN IF NOT EXISTS "estimatedCompletionDate"  TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "tenantRating"             INTEGER,
  ADD COLUMN IF NOT EXISTS "tenantFeedback"           TEXT,
  ADD COLUMN IF NOT EXISTS "comments"                 JSON;

-- Made with Bob
