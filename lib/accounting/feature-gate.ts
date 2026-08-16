/**
 * Feature gate for the advanced accounting tier.
 *
 * The accounting primitives (postJournalEntry, getTrialBalance, etc.) are
 * safe to call for any landlord — but we surface them in the UI and APIs
 * only when the landlord's subscription tier includes them.
 *
 *   Starter    →  basicAnalytics + Rent Roll only
 *   Pro        →  Starter + full reporting suite (P&L, Balance Sheet, Trial Balance,
 *                 AR Aging, Cash Flow, Tenant Ledger, Owner Statements, Bank Recon)
 *   Enterprise →  Pro + management layer (Journal, COA editor, AP, Budget,
 *                 Depreciation, Tax Summary, Audit Log, Fiscal Periods)
 *
 * `assertAccountingReports()` / `assertAccountingLedger()` / `assertAccountingManagement()`
 * are what the API routes call to gate a request.
 *
 * `getAccountingGateStatus()` is what server-rendered page.tsx files call
 * to decide whether to render the real page or an upsell page.
 */

import { prisma as db } from '@/db/prisma';
import {
  hasFeatureAccess,
  normalizeTier,
  type SubscriptionTier,
} from '@/lib/config/subscription-tiers';

// ─── Error Classes ─────────────────────────────────────────────────────────

export class AccountingAccessDeniedError extends Error {
  status = 403;
  code = 'TIER_LOCKED';
  constructor(
    public requiredTier: SubscriptionTier,
    public currentTier: SubscriptionTier,
    public featureLabel = 'Advanced accounting',
  ) {
    super(`${featureLabel} requires the ${requiredTier} plan (you are on ${currentTier}).`);
    this.name = 'AccountingAccessDeniedError';
  }
}

// ─── Tier Resolution ────────────────────────────────────────────────────────

/** Returns the landlord's effective tier (falls back to 'starter'). */
export async function getLandlordTier(landlordId: string): Promise<SubscriptionTier> {
  const landlord = await db.landlord.findUnique({
    where: { id: landlordId },
    select: { subscriptionTier: true },
  });
  return normalizeTier(landlord?.subscriptionTier);
}

// ─── Gate Status (used by page.tsx server components) ──────────────────────

export interface AccountingGateStatus {
  tier: SubscriptionTier;
  /** Starter+: Rent Roll access */
  canViewRentRoll: boolean;
  /** Pro+: P&L, Balance Sheet, Trial Balance, AR Aging, Cash Flow */
  canViewReports: boolean;
  /** Pro+: Tenant Ledger, Owner Statements, Bank Reconciliation */
  canViewLedger: boolean;
  /** Enterprise only: Journal, COA editor, AP, Budget, Depreciation, Tax, Audit */
  canManage: boolean;
}

/**
 * One-stop call for page.tsx files.
 * Returns the current tier and all four access booleans.
 * Never throws — use the booleans to decide what to render.
 */
export async function getAccountingGateStatus(landlordId: string): Promise<AccountingGateStatus> {
  const tier = await getLandlordTier(landlordId);
  return {
    tier,
    canViewRentRoll:  hasFeatureAccess(tier, 'accountingRentRoll'),
    canViewReports:   hasFeatureAccess(tier, 'accountingReports'),
    canViewLedger:    hasFeatureAccess(tier, 'accountingLedger'),
    canManage:        hasFeatureAccess(tier, 'accountingManagement'),
  };
}

// ─── Per-Feature Assertions (used by API routes) ────────────────────────────

/** Throws if the landlord cannot access the reports tier (Pro+). */
export async function assertAccountingReports(landlordId: string): Promise<SubscriptionTier> {
  const tier = await getLandlordTier(landlordId);
  if (!hasFeatureAccess(tier, 'accountingReports')) {
    throw new AccountingAccessDeniedError('pro', tier, 'Financial reports');
  }
  return tier;
}

/** Throws if the landlord cannot access the ledger tier (Pro+). */
export async function assertAccountingLedger(landlordId: string): Promise<SubscriptionTier> {
  const tier = await getLandlordTier(landlordId);
  if (!hasFeatureAccess(tier, 'accountingLedger')) {
    throw new AccountingAccessDeniedError('pro', tier, 'Tenant ledger & owner statements');
  }
  return tier;
}

/** Throws if the landlord cannot access the management tier (Enterprise only). */
export async function assertAccountingManagement(landlordId: string): Promise<SubscriptionTier> {
  const tier = await getLandlordTier(landlordId);
  if (!hasFeatureAccess(tier, 'accountingManagement')) {
    throw new AccountingAccessDeniedError('enterprise', tier, 'Accounting management tools');
  }
  return tier;
}

/**
 * Legacy: kept for backward compatibility with existing callers.
 * Maps to Pro+ (accountingReports). Prefer the specific assertions above.
 */
export async function assertAccountingAccess(landlordId: string): Promise<SubscriptionTier> {
  return assertAccountingReports(landlordId);
}

/** True iff the landlord's tier includes advanced accounting features (Pro+). */
export async function landlordHasAccounting(landlordId: string): Promise<boolean> {
  const tier = await getLandlordTier(landlordId);
  return hasFeatureAccess(tier, 'accountingReports');
}

// ─── Upsell Messaging ───────────────────────────────────────────────────────

/**
 * What each tier gets — single source of truth for upsell copy.
 * Used by AccountingUpsellPage and AccountingUpsellBanner.
 */
export const ACCOUNTING_TIER_FEATURES = {
  starter: {
    accounting: false,
    description: 'Rent collection, Invoices, Rent Roll, and basic Analytics',
    nextTier: 'pro' as SubscriptionTier,
    nextTierTeaser: 'Upgrade to Pro to unlock the full reporting suite — P&L, Balance Sheet, Tenant Ledger, Owner Statements, and more.',
  },
  pro: {
    accounting: true,
    description: 'Full reporting suite: P&L · Balance Sheet · Trial Balance · Tenant Ledger · Owner Statements · Bank Reconciliation',
    nextTier: 'enterprise' as SubscriptionTier,
    nextTierTeaser: 'Upgrade to Enterprise to unlock the management layer — Journal Entries, AP/Bills, Budget vs Actual, Depreciation, Tax Export, and Audit Log.',
  },
  enterprise: {
    accounting: true,
    description: 'Everything in Pro + Journal Entries · Chart of Accounts · AP/Vendors/Bills · Budget vs Actual · Depreciation · Schedule E · Audit Log',
    nextTier: null,
    nextTierTeaser: null,
  },
} as const;

export function describeAccountingAccess(tier: SubscriptionTier): string {
  return ACCOUNTING_TIER_FEATURES[tier].description;
}

/**
 * Returns the upsell teaser message pointing to the next tier above the user.
 * Returns null if already on Enterprise.
 */
export function getNextTierTeaser(tier: SubscriptionTier): string | null {
  return ACCOUNTING_TIER_FEATURES[tier].nextTierTeaser;
}
