-- CreateTable: TenantLandlordLink
CREATE TABLE "TenantLandlordLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "signupMethod" TEXT,
    "inviteCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedAt" TIMESTAMP(6),
    "assignedToPropertyId" UUID,
    "assignedToUnitId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(6),
    "archivedReason" TEXT,

    CONSTRAINT "TenantLandlordLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LandlordInviteCode
CREATE TABLE "LandlordInviteCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "expiresAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandlordInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantLandlordLink_tenantId_landlordId_key" ON "TenantLandlordLink"("tenantId", "landlordId");

-- CreateIndex
CREATE INDEX "TenantLandlordLink_landlordId_status_idx" ON "TenantLandlordLink"("landlordId", "status");

-- CreateIndex
CREATE INDEX "TenantLandlordLink_status_createdAt_idx" ON "TenantLandlordLink"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordInviteCode_code_key" ON "LandlordInviteCode"("code");

-- CreateIndex
CREATE INDEX "LandlordInviteCode_code_isActive_idx" ON "LandlordInviteCode"("code", "isActive");

-- CreateIndex
CREATE INDEX "LandlordInviteCode_landlordId_idx" ON "LandlordInviteCode"("landlordId");

-- AddForeignKey
ALTER TABLE "TenantLandlordLink" ADD CONSTRAINT "TenantLandlordLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLandlordLink" ADD CONSTRAINT "TenantLandlordLink_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLandlordLink" ADD CONSTRAINT "TenantLandlordLink_assignedToPropertyId_fkey" FOREIGN KEY ("assignedToPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantLandlordLink" ADD CONSTRAINT "TenantLandlordLink_assignedToUnitId_fkey" FOREIGN KEY ("assignedToUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordInviteCode" ADD CONSTRAINT "LandlordInviteCode_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Made with Bob
