-- Cleanup script to remove test users created during test runs
-- Run with: psql <your-database-url> -f scripts/cleanup-test-users.sql
-- Or copy and paste into your database client

BEGIN;

-- Show what will be deleted
SELECT 'Test Users to Delete:' as info;
SELECT id, email, role, "createdAt" 
FROM "User" 
WHERE email LIKE '%@example.com%' 
   OR email LIKE '%test-%'
   OR email LIKE '%contractor-%'
   OR email LIKE '%customer-%'
   OR email LIKE '%landlord-%';

-- Get landlord profile IDs
CREATE TEMP TABLE temp_landlord_profiles AS
SELECT l.id as landlord_id
FROM "Landlord" l
INNER JOIN "User" u ON l."ownerUserId" = u.id
WHERE u.email LIKE '%@example.com%' 
   OR u.email LIKE '%test-%'
   OR u.email LIKE '%contractor-%'
   OR u.email LIKE '%customer-%'
   OR u.email LIKE '%landlord-%';

-- Get user IDs
CREATE TEMP TABLE temp_user_ids AS
SELECT id as user_id
FROM "User" 
WHERE email LIKE '%@example.com%' 
   OR email LIKE '%test-%'
   OR email LIKE '%contractor-%'
   OR email LIKE '%customer-%'
   OR email LIKE '%landlord-%';

-- Delete dispute-related data
DELETE FROM "DisputeTimeline" 
WHERE "disputeId" IN (
  SELECT id FROM "Dispute" WHERE "landlordId" IN (SELECT landlord_id FROM temp_landlord_profiles)
);

DELETE FROM "DisputeEvidence" 
WHERE "disputeId" IN (
  SELECT id FROM "Dispute" WHERE "landlordId" IN (SELECT landlord_id FROM temp_landlord_profiles)
);

DELETE FROM "DisputeMessage" 
WHERE "disputeId" IN (
  SELECT id FROM "Dispute" WHERE "landlordId" IN (SELECT landlord_id FROM temp_landlord_profiles)
);

DELETE FROM "Dispute" 
WHERE "landlordId" IN (SELECT landlord_id FROM temp_landlord_profiles);

-- Delete job guarantee holds
DELETE FROM "JobGuaranteeHold" 
WHERE "contractorId" IN (SELECT user_id FROM temp_user_ids)
   OR "customerId" IN (SELECT user_id FROM temp_user_ids);

-- Delete contractor profiles
DELETE FROM "Contractor" 
WHERE "userId" IN (SELECT user_id FROM temp_user_ids);

-- Delete landlord profiles
DELETE FROM "Landlord" 
WHERE id IN (SELECT landlord_id FROM temp_landlord_profiles);

-- Delete test users
DELETE FROM "User" 
WHERE id IN (SELECT user_id FROM temp_user_ids);

-- Show summary
SELECT 'Cleanup completed!' as info;

COMMIT;
