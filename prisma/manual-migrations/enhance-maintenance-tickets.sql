-- Add enhanced fields to MaintenanceTicket table
-- Run this migration after updating the schema

ALTER TABLE "MaintenanceTicket" 
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "attachments" JSON,
ADD COLUMN IF NOT EXISTS "accessSchedule" JSON,
ADD COLUMN IF NOT EXISTS "accessNotes" TEXT,
ADD COLUMN IF NOT EXISTS "estimatedCompletionDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "tenantRating" INTEGER,
ADD COLUMN IF NOT EXISTS "tenantFeedback" TEXT,
ADD COLUMN IF NOT EXISTS "comments" JSON;

-- Add check constraint for rating (1-5 stars)
ALTER TABLE "MaintenanceTicket"
ADD CONSTRAINT "MaintenanceTicket_tenantRating_check" 
CHECK ("tenantRating" IS NULL OR ("tenantRating" >= 1 AND "tenantRating" <= 5));

-- Add index for faster queries on status and priority
CREATE INDEX IF NOT EXISTS "MaintenanceTicket_status_priority_idx" 
ON "MaintenanceTicket" ("status", "priority");

-- Add index for tenant queries
CREATE INDEX IF NOT EXISTS "MaintenanceTicket_tenantId_status_idx" 
ON "MaintenanceTicket" ("tenantId", "status");

-- Made with Bob
