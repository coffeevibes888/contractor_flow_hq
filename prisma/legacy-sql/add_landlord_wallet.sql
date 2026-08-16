-- Migration: Add Landlord Wallet System
-- Run this migration to enable the direct bank transfer payout system

-- Add walletCredited fields to RentPayment
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "walletCredited" BOOLEAN DEFAULT false;
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "walletCreditedAt" TIMESTAMP(6);

-- Create LandlordWallet table
CREATE TABLE IF NOT EXISTS "LandlordWallet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastPayoutAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandlordWallet_pkey" PRIMARY KEY ("id")
);

-- Create unique index on landlordId
CREATE UNIQUE INDEX IF NOT EXISTS "LandlordWallet_landlordId_key" ON "LandlordWallet"("landlordId");

-- Create index on landlordId
CREATE INDEX IF NOT EXISTS "LandlordWallet_landlordId_idx" ON "LandlordWallet"("landlordId");

-- Add foreign key constraint
ALTER TABLE "LandlordWallet" 
ADD CONSTRAINT "LandlordWallet_landlordId_fkey" 
FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create WalletTransaction table
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "walletId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "referenceId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- Create indexes for WalletTransaction
CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_type_idx" ON "WalletTransaction"("type");
CREATE INDEX IF NOT EXISTS "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- Add foreign key constraint
ALTER TABLE "WalletTransaction" 
ADD CONSTRAINT "WalletTransaction_walletId_fkey" 
FOREIGN KEY ("walletId") REFERENCES "LandlordWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
