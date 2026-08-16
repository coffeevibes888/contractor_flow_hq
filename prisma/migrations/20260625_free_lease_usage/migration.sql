-- CreateTable
CREATE TABLE "FreeLeaseUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeLeaseUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeLeaseUsage_email_key" ON "FreeLeaseUsage"("email");

-- CreateIndex
CREATE INDEX "FreeLeaseUsage_email_idx" ON "FreeLeaseUsage"("email");
