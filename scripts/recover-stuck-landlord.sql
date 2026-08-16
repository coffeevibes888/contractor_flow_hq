-- Recover a landlord account that got stuck in the onboarding/subscription
-- redirect loop because their trial dates never got set.
--
-- BEFORE RUNNING:  edit the email below to match the affected user.
--
-- This script:
--   1. Sets User.role = 'landlord' (if it wasn't already)
--   2. Sets User.onboardingCompleted = true
--   3. Initializes Landlord trial dates (14 days from now) and trialStatus
--      = 'trialing' so the SubscriptionGate sees a legitimate trial.
--
-- It is idempotent: rerunning won't reset the trial start date if one
-- already exists, and won't change role away from existing 'landlord'.
--
-- Run with:
--   npx prisma db execute --file scripts/recover-stuck-landlord.sql

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'REPLACE_WITH_USER_EMAIL@example.com';
BEGIN
  SELECT id INTO v_user_id FROM "User" WHERE LOWER(email) = LOWER(v_email);
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No user with email %', v_email;
    RETURN;
  END IF;

  -- 1. Promote role to landlord and mark onboarding complete (only if not
  --    already a privileged role).
  UPDATE "User"
  SET role = 'landlord',
      "onboardingCompleted" = true
  WHERE id = v_user_id
    AND role NOT IN ('admin', 'superAdmin', 'landlord', 'property_manager');

  -- 2. Make sure a Landlord record exists for this user. If not, create
  --    a minimal one. (Most flows do create one — but if they got really
  --    stuck before getOrCreateCurrentLandlord ran, this saves them.)
  INSERT INTO "Landlord" ("ownerUserId", "name", "subdomain", "trialStartDate", "trialEndDate", "trialStatus", "subscriptionStatus")
  SELECT
    v_user_id,
    COALESCE((SELECT name FROM "User" WHERE id = v_user_id), 'My Properties'),
    'lord-' || SUBSTRING(v_user_id::text FROM 1 FOR 8),
    NOW(),
    NOW() + INTERVAL '14 days',
    'trialing',
    'trialing'
  WHERE NOT EXISTS (SELECT 1 FROM "Landlord" WHERE "ownerUserId" = v_user_id);

  -- 3. Initialize trial dates if they were never set.
  UPDATE "Landlord"
  SET "trialStartDate" = COALESCE("trialStartDate", NOW()),
      "trialEndDate"   = COALESCE("trialEndDate",   NOW() + INTERVAL '14 days'),
      "trialStatus"    = COALESCE(NULLIF("trialStatus", ''), 'trialing'),
      "subscriptionStatus" = COALESCE(NULLIF("subscriptionStatus", ''), 'trialing')
  WHERE "ownerUserId" = v_user_id;

  RAISE NOTICE 'Recovered landlord account for %', v_email;
END $$;
