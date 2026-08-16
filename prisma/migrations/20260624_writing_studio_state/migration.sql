-- Add WritingStudioState table for cross-device persistence of the Writing Studio.
-- One row per super-admin user; upserted on every auto-save.

CREATE TABLE IF NOT EXISTS "WritingStudioState" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID        NOT NULL,
  "state"     JSON        NOT NULL,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT now(),

  CONSTRAINT "WritingStudioState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WritingStudioState_userId_key"
  ON "WritingStudioState"("userId");

CREATE INDEX IF NOT EXISTS "WritingStudioState_userId_idx"
  ON "WritingStudioState"("userId");

ALTER TABLE "WritingStudioState"
  ADD CONSTRAINT "WritingStudioState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Made with Bob
