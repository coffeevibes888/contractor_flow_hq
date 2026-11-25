-- Marketplace messaging: inquiry threads between external (partner-site)
-- customers and contractors. Customers need no account, so these tables do
-- not reference the User table.

-- CreateTable
CREATE TABLE "MarketplaceMessageThread" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerUserId" UUID,
    "leadId" UUID,
    "lastMessageAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceMessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "senderSide" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceMessageThread_contractorId_customerEmail_key" ON "MarketplaceMessageThread"("contractorId", "customerEmail");

-- CreateIndex
CREATE INDEX "MarketplaceMessageThread_contractorId_idx" ON "MarketplaceMessageThread"("contractorId");

-- CreateIndex
CREATE INDEX "MarketplaceMessageThread_lastMessageAt_idx" ON "MarketplaceMessageThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "MarketplaceMessage_threadId_idx" ON "MarketplaceMessage"("threadId");

-- CreateIndex
CREATE INDEX "MarketplaceMessage_createdAt_idx" ON "MarketplaceMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "MarketplaceMessageThread" ADD CONSTRAINT "MarketplaceMessageThread_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MarketplaceMessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
