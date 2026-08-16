DELETE FROM "TeamMember" WHERE "userId" NOT IN (SELECT id FROM "User");
