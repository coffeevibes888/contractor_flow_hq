-- Add trial fields to Landlord table
ALTER TABLE "Landlord" 
ADD COLUMN IF NOT EXISTS "trialStartDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialStatus" TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS "gracePeriodsUsed" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastGracePeriodDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialRemindersSent" JSONB;

-- Update existing landlords to set trial dates (14 days from creation)
UPDATE "Landlord"
SET 
  "trialStartDate" = "createdAt",
  "trialEndDate" = "createdAt" + INTERVAL '14 days',
  "trialStatus" = CASE 
    WHEN "stripeSubscriptionId" IS NOT NULL THEN 'active'
    WHEN "createdAt" + INTERVAL '14 days' > NOW() THEN 'trialing'
    WHEN "createdAt" + INTERVAL '17 days' > NOW() THEN 'trial_expired'
    ELSE 'suspended'
  END,
  "subscriptionStatus" = CASE
    WHEN "stripeSubscriptionId" IS NOT NULL THEN "subscriptionStatus"
    ELSE 'trialing'
  END
WHERE "trialStartDate" IS NULL;

-- Add trial fields to ContractorProfile table
ALTER TABLE "ContractorProfile"
ADD COLUMN IF NOT EXISTS "trialStartDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialStatus" TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS "gracePeriodsUsed" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastGracePeriodDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialRemindersSent" JSONB;

-- Update existing contractors
UPDATE "ContractorProfile"
SET 
  "trialStartDate" = "createdAt",
  "trialEndDate" = "createdAt" + INTERVAL '14 days',
  "trialStatus" = CASE 
    WHEN "stripeSubscriptionId" IS NOT NULL THEN 'active'
    WHEN "createdAt" + INTERVAL '14 days' > NOW() THEN 'trialing'
    WHEN "createdAt" + INTERVAL '17 days' > NOW() THEN 'trial_expired'
    ELSE 'suspended'
  END,
  "subscriptionStatus" = CASE
    WHEN "stripeSubscriptionId" IS NOT NULL THEN "subscriptionStatus"
    ELSE 'trialing'
  END
WHERE "trialStartDate" IS NULL;

-- Add trial fields to Agent table
ALTER TABLE "Agent"
ADD COLUMN IF NOT EXISTS "trialStartDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialStatus" TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS "gracePeriodsUsed" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastGracePeriodDate" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "trialRemindersSent" JSONB;

-- Update existing agents
UPDATE "Agent"
SET 
  "trialStartDate" = "createdAt",
  "trialEndDate" = "createdAt" + INTERVAL '14 days',
  "trialStatus" = CASE 
    WHEN "stripeSubscriptionId" IS NOT NULL THEN 'active'
    WHEN "createdAt" + INTERVAL '14 days' > NOW() THEN 'trialing'
    WHEN "createdAt" + INTERVAL '17 days' > NOW() THEN 'trial_expired'
    ELSE 'suspended'
  END,
  "subscriptionStatus" = CASE
    WHEN "stripeSubscriptionId" IS NOT NULL THEN "subscriptionStatus"
    ELSE 'trialing'
  END
WHERE "trialStartDate" IS NULL;
