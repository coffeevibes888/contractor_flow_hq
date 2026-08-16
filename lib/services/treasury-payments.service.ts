/**
 * Treasury Payments Service — the single code path for ALL marketplace
 * money movement.
 *
 * Every contractor payment now goes through one of three calls:
 *   - executeSinglePayment()         — instant book / direct hire
 *   - releaseMilestoneViaTreasury()  — milestone or materials advance
 *   - executeContractorCashout()     — contractor → their external bank
 *
 * The fee model (per prompt 3 + the live marketplace copy):
 *   "Only $1 fee per payment or cashout"
 *   - Landlord pays job amount, contractor receives job amount - $1.
 *   - The $1 is moved separately into Property Flow HQ's own Treasury
 *     account via a second OutboundPayment.
 *   - Cashout: contractor receives net = balance - $1.
 *
 * Key principles:
 *   - Money never moves on bid acceptance — only on a landlord's explicit
 *     "Release" / "Pay" click.
 *   - We never reach into PaymentIntents, Connect Transfers, or anything
 *     else legacy. Treasury OutboundTransfers (and OutboundPayments for
 *     fees) are the only primitives.
 *   - Every guard rail is enforced *before* a single Stripe call. If a
 *     guard rail fails we record the attempt to PaymentAttempt and return
 *     a specific reason — never a generic error.
 */

import 'server-only';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import type { Prisma } from '@prisma/client';

/** Single source of truth for the marketplace platform fee. */
export const MARKETPLACE_PLATFORM_FEE_CENTS = 100; // $1.00
export const MARKETPLACE_MIN_CASHOUT_CENTS = 500; // $5.00

export type TreasuryTransferType =
  | 'single'
  | 'milestone'
  | 'materials_advance'
  | 'cashout';

export type TreasuryStatus = 'pending' | 'posted' | 'failed';

export type GuardRailFailure =
  | 'sender_not_verified'
  | 'recipient_not_verified'
  | 'sender_no_wallet'
  | 'recipient_no_wallet'
  | 'insufficient_balance'
  | 'active_dispute'
  | 'invalid_amount'
  | 'amount_below_minimum'
  | 'no_external_bank';

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  treasuryTransferId?: string;
  /** Final status from Stripe at the moment we returned. */
  treasuryStatus?: TreasuryStatus;
  /** Net amount the contractor received (after fee). */
  contractorReceives?: number;
  platformFee?: number;
  /** When success=false, the reason — never a generic message. */
  reason?: GuardRailFailure | 'stripe_error' | 'unknown';
  message?: string;
}

// ────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────

/**
 * Resolve the sender's Treasury financial account from a landlord id.
 * Returns null if the landlord isn't yet verified or doesn't have one.
 */
async function getLandlordWallet(landlordId: string) {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: {
      id: true,
      stripeOnboardingStatus: true,
      stripeTreasuryEnabled: true,
      ownerUserId: true,
    },
  });
  if (!landlord) return null;
  if (landlord.stripeOnboardingStatus !== 'verified') return null;

  const fa = await prisma.financialAccount.findFirst({
    where: { landlordId, status: { in: ['pending', 'active'] } },
    select: {
      id: true,
      stripeFinancialAccountId: true,
      stripeConnectedAccountId: true,
    },
  });
  if (!fa) return null;
  return { landlord, fa };
}

/**
 * Resolve the recipient's Treasury financial account from a Contractor row
 * (the directory model used by WorkOrder / ContractorPayment) OR a
 * ContractorProfile (the marketplace model used by JobEscrow).
 */
async function getContractorWallet(opts: {
  contractorId?: string; // Contractor (directory) id
  contractorProfileId?: string; // ContractorProfile (marketplace) id
}) {
  // First map either id to a userId so we can fetch the right
  // ContractorProfile row + then its FinancialAccount.
  let contractorProfileId: string | null = opts.contractorProfileId ?? null;

  if (!contractorProfileId && opts.contractorId) {
    const dir = await prisma.contractor.findUnique({
      where: { id: opts.contractorId },
      select: { userId: true },
    });
    if (dir?.userId) {
      const profile = await prisma.contractorProfile.findFirst({
        where: { userId: dir.userId },
        select: { id: true },
      });
      contractorProfileId = profile?.id ?? null;
    }
  }

  if (!contractorProfileId) return null;

  const profile = await prisma.contractorProfile.findUnique({
    where: { id: contractorProfileId },
    select: {
      id: true,
      userId: true,
    },
  });
  if (!profile) return null;

  // Look up the contractor's FinancialAccount row. We index it by
  // contractorId on the Contractor (directory) row OR by contractorId on
  // the FA itself — the FA model has both pathways.
  const fa = await prisma.financialAccount.findFirst({
    where: {
      contractorId: profile.id,
      status: { in: ['pending', 'active'] },
    },
    select: {
      id: true,
      stripeFinancialAccountId: true,
      stripeConnectedAccountId: true,
    },
  });
  if (!fa) return null;
  return { profile, fa };
}

/**
 * Pull the live cash balance from Stripe — never trust a cached number for
 * money decisions.
 */
async function getLiveCashBalanceCents(opts: {
  stripeFinancialAccountId: string;
  stripeConnectedAccountId: string;
}): Promise<number> {
  const fa = await stripe.treasury.financialAccounts.retrieve(
    opts.stripeFinancialAccountId,
    {},
    { stripeAccount: opts.stripeConnectedAccountId }
  );
  return fa.balance?.cash?.usd ?? 0;
}

/**
 * Pull the recipient's ABA (routing + account) info — required to address
 * the OutboundTransfer correctly.
 */
async function getRecipientAba(opts: {
  stripeFinancialAccountId: string;
  stripeConnectedAccountId: string;
}): Promise<
  | { routing_number: string; account_number: string }
  | null
> {
  const fa = await stripe.treasury.financialAccounts.retrieve(
    opts.stripeFinancialAccountId,
    { expand: ['financial_addresses'] },
    { stripeAccount: opts.stripeConnectedAccountId }
  );
  const aba = fa.financial_addresses?.find((a) => a.type === 'aba')?.aba;
  if (!aba?.routing_number || !aba.account_number) return null;
  return {
    routing_number: aba.routing_number,
    account_number: aba.account_number,
  };
}

/**
 * Get the platform's own Treasury financial account so we can sweep the
 * $1 fee into it. Configured via env so we don't hardcode an ID. If
 * unconfigured, fee collection is skipped (the contractor still receives
 * `amount - $1`; the $1 stays in the landlord's wallet pending sweep).
 */
function getPlatformFeeAccount(): {
  financialAccountId: string;
  connectedAccountId: string;
} | null {
  const fa = process.env.STRIPE_PLATFORM_TREASURY_ACCOUNT_ID;
  const conn = process.env.STRIPE_PLATFORM_CONNECTED_ACCOUNT_ID;
  if (!fa || !conn) return null;
  return { financialAccountId: fa, connectedAccountId: conn };
}

/**
 * Log a payment that didn't make it past guard rails. Best-effort — never
 * blocks the calling path.
 */
async function logFailedAttempt(args: {
  jobId?: string;
  userId?: string;
  landlordId?: string;
  contractorId?: string;
  amount: number; // dollars
  transferType: TreasuryTransferType;
  reasonFailed: GuardRailFailure | 'stripe_error';
  errorDetail?: string;
}) {
  try {
    await prisma.paymentAttempt.create({
      data: {
        jobId: args.jobId,
        userId: args.userId,
        landlordId: args.landlordId,
        contractorId: args.contractorId,
        amount: args.amount,
        transferType: args.transferType,
        reasonFailed: args.reasonFailed,
        errorDetail: args.errorDetail?.slice(0, 500),
      },
    });
  } catch (err) {
    console.error('[treasury-payments] paymentAttempt log failed', err);
  }
}

/**
 * Convert a guard rail key into a user-facing message. Centralized so
 * every API surface returns the same wording for the same condition.
 */
export function reasonToUserMessage(reason: GuardRailFailure): string {
  switch (reason) {
    case 'sender_not_verified':
      return 'Finish identity verification before sending payments.';
    case 'recipient_not_verified':
      return 'The contractor has not yet completed identity verification.';
    case 'sender_no_wallet':
      return 'Your wallet is still being provisioned. Try again shortly.';
    case 'recipient_no_wallet':
      return "The contractor's wallet is not ready to receive payments yet.";
    case 'insufficient_balance':
      return 'Insufficient wallet balance for this payment plus the $1 fee.';
    case 'active_dispute':
      return 'There is an active dispute on this job. Resolve it before paying.';
    case 'invalid_amount':
      return 'Amount must be greater than zero.';
    case 'amount_below_minimum':
      return 'Cashout must be at least $5.';
    case 'no_external_bank':
      return 'Link a bank account before cashing out.';
  }
}

// ────────────────────────────────────────────────────────────────────────
// Core: collect the $1 fee
// ────────────────────────────────────────────────────────────────────────

async function collectPlatformFee(opts: {
  fromConnectedAccountId: string;
  fromFinancialAccountId: string;
  /** The user-facing transferType to record on metadata. */
  transferType: TreasuryTransferType;
  /** Extra context for traceability. */
  metadata: Record<string, string>;
}): Promise<{ feeTransferId: string | null }> {
  const dest = getPlatformFeeAccount();
  if (!dest) {
    console.warn(
      '[treasury-payments] STRIPE_PLATFORM_TREASURY_ACCOUNT_ID not set; fee not swept'
    );
    return { feeTransferId: null };
  }

  // We sweep into the platform's FA via OutboundPayment routed at our own
  // ABA. This is the only practical path between two Stripe-issued
  // accounts because Treasury doesn't have a direct intra-account API.
  const aba = await getRecipientAba({
    stripeFinancialAccountId: dest.financialAccountId,
    stripeConnectedAccountId: dest.connectedAccountId,
  });
  if (!aba) {
    console.warn(
      '[treasury-payments] platform FA has no ABA; fee not swept'
    );
    return { feeTransferId: null };
  }

  const fee = await stripe.treasury.outboundPayments.create(
    {
      financial_account: opts.fromFinancialAccountId,
      amount: MARKETPLACE_PLATFORM_FEE_CENTS,
      currency: 'usd',
      description: 'Property Flow HQ platform fee',
      statement_descriptor: 'PROPFLOW FEE',
      destination_payment_method_data: {
        type: 'us_bank_account',
        us_bank_account: {
          routing_number: aba.routing_number,
          account_number: aba.account_number,
          account_holder_type: 'individual',
        },
        billing_details: { name: 'Property Flow HQ' },
      },
      metadata: {
        ...opts.metadata,
        purpose: 'marketplace_platform_fee',
        transferType: opts.transferType,
      },
    },
    { stripeAccount: opts.fromConnectedAccountId }
  );
  return { feeTransferId: fee.id };
}

// ────────────────────────────────────────────────────────────────────────
// Core: execute the contractor leg (landlord wallet → contractor wallet)
// ────────────────────────────────────────────────────────────────────────

interface ExecuteParams {
  amountCents: number;
  landlordId: string;
  contractorId?: string; // directory Contractor id
  contractorProfileId?: string; // marketplace ContractorProfile id
  transferType: TreasuryTransferType;
  /** Free-form description to store on the Stripe transfer. */
  description?: string;
  /** Stripe metadata. */
  metadata?: Record<string, string>;
  /** Job id for guard-rail dispute lookup (work order id or job id). */
  jobId?: string;
  /** Disambiguates the dispute lookup — work_order or contractor_job. */
  jobKind?: 'work_order' | 'contractor_job';
  /** Calling user id, for the audit row when guards fail. */
  callerUserId?: string;
  /** Milestone refs so the resulting ContractorPayment row links back. */
  milestoneRefId?: string;
  milestoneRefType?: 'work_order_milestone' | 'job_milestone';
  /** Optional pre-existing ContractorPayment row id we should update on
   *  success (for retries). When omitted, we create one. */
  existingPaymentId?: string;
}
async function checkGuardRails(args: ExecuteParams): Promise<{
  reason?: GuardRailFailure;
  detail?: string;
  sender?: NonNullable<Awaited<ReturnType<typeof getLandlordWallet>>>;
  recipient?: NonNullable<Awaited<ReturnType<typeof getContractorWallet>>>;
}> {
  if (args.amountCents <= 0) return { reason: 'invalid_amount' };

  const [sender, recipient] = await Promise.all([
    getLandlordWallet(args.landlordId),
    getContractorWallet({
      contractorId: args.contractorId,
      contractorProfileId: args.contractorProfileId,
    }),
  ]);

  if (!sender) return { reason: 'sender_not_verified' };
  if (!recipient) return { reason: 'recipient_not_verified' };

  // Active dispute lookup (work order side)
  if (args.jobId && args.jobKind === 'work_order') {
    const dispute = await prisma.workOrderDispute.findFirst({
      where: {
        workOrderId: args.jobId,
        status: { in: ['open', 'reviewing'] },
      },
      select: { id: true },
    });
    if (dispute) return { reason: 'active_dispute' };
  }
  if (args.jobId && args.jobKind === 'contractor_job') {
    const escrow = await prisma.jobEscrow.findUnique({
      where: { contractorJobId: args.jobId },
      select: { status: true },
    });
    if (escrow?.status === 'disputed') return { reason: 'active_dispute' };
  }

  // Live balance check — cents math, never floats.
  const live = await getLiveCashBalanceCents(sender.fa);
  if (live < args.amountCents) {
    return {
      reason: 'insufficient_balance',
      detail: `available=${live}cents need=${args.amountCents}cents`,
    };
  }

  return { sender, recipient };
}

/**
 * Execute the actual Stripe OutboundTransfer + fee leg + DB record.
 *
 * We split the amount: contractor receives (amountCents - 100), platform
 * keeps 100 ($1). If the platform fee leg fails, the contractor leg has
 * already gone through — we mark `platformFeeCollected=false` and leave
 * a sweep job to retry. We NEVER fail the contractor payment because
 * the fee leg failed.
 */
async function executeContractorLeg(args: ExecuteParams & {
  sender: NonNullable<Awaited<ReturnType<typeof getLandlordWallet>>>;
  recipient: NonNullable<Awaited<ReturnType<typeof getContractorWallet>>>;
}): Promise<PaymentResult> {
  const contractorAmountCents = args.amountCents - MARKETPLACE_PLATFORM_FEE_CENTS;
  if (contractorAmountCents <= 0) {
    return { success: false, reason: 'invalid_amount', message: 'Amount must exceed the $1 platform fee.' };
  }

  // Prepare or load the ContractorPayment row.
  let payment;
  if (args.existingPaymentId) {
    payment = await prisma.contractorPayment.findUnique({
      where: { id: args.existingPaymentId },
    });
    if (!payment) {
      return { success: false, reason: 'unknown', message: 'Payment record vanished.' };
    }
  } else {
    payment = await prisma.contractorPayment.create({
      data: {
        landlordId: args.sender.landlord.id,
        contractorId: args.recipient.profile.id,
        workOrderId:
          args.jobKind === 'work_order' ? args.jobId : undefined,
        amount: args.amountCents / 100,
        platformFee: MARKETPLACE_PLATFORM_FEE_CENTS / 100,
        netAmount: contractorAmountCents / 100,
        status: 'processing',
        transferType: args.transferType,
        treasuryStatus: 'pending',
        platformFeeCollected: false,
        description: args.description,
        milestoneRefId: args.milestoneRefId,
        milestoneRefType: args.milestoneRefType,
        metadata: (args.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  // Look up recipient ABA and queue the contractor leg.
  const aba = await getRecipientAba(args.recipient.fa);
  if (!aba) {
    await prisma.contractorPayment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        treasuryStatus: 'failed',
        failureReason: 'recipient ABA not yet issued',
      },
    });
    await logFailedAttempt({
      jobId: args.jobId,
      userId: args.callerUserId,
      landlordId: args.sender.landlord.id,
      contractorId: args.recipient.profile.id,
      amount: args.amountCents / 100,
      transferType: args.transferType,
      reasonFailed: 'recipient_no_wallet',
    });
    return {
      success: false,
      reason: 'recipient_no_wallet',
      message: "The contractor's wallet is not ready to receive payments yet.",
    };
  }

  let transfer;
  try {
    transfer = await stripe.treasury.outboundTransfers.create(
      {
        financial_account: args.sender.fa.stripeFinancialAccountId,
        amount: contractorAmountCents,
        currency: 'usd',
        destination_payment_method_data: {
          type: 'us_bank_account',
          us_bank_account: {
            routing_number: aba.routing_number,
            account_number: aba.account_number,
            account_holder_type: 'individual',
          },
        },
        description:
          args.description || labelForType(args.transferType, false),
        statement_descriptor: 'PROPFLOW',
        metadata: {
          paymentId: payment.id,
          landlordId: args.sender.landlord.id,
          contractorProfileId: args.recipient.profile.id,
          transferType: args.transferType,
          ...(args.jobId ? { jobId: args.jobId, jobKind: args.jobKind ?? '' } : {}),
          ...(args.metadata ?? {}),
        },
      },
      { stripeAccount: args.sender.fa.stripeConnectedAccountId }
    );
  } catch (err: any) {
    await prisma.contractorPayment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        treasuryStatus: 'failed',
        failureReason: err?.message?.slice(0, 200) || 'stripe_error',
      },
    });
    await logFailedAttempt({
      jobId: args.jobId,
      userId: args.callerUserId,
      landlordId: args.sender.landlord.id,
      contractorId: args.recipient.profile.id,
      amount: args.amountCents / 100,
      transferType: args.transferType,
      reasonFailed: 'stripe_error',
      errorDetail: err?.message,
    });
    return {
      success: false,
      reason: 'stripe_error',
      message: err?.raw?.message || err?.message || 'Stripe rejected the transfer.',
    };
  }

  // Sweep the $1 fee. Best-effort — failure here doesn't fail the payment.
  // We only run it if the row hasn't already collected the fee (idempotent
  // for retries: see treasury.outbound_transfer.failed retry path).
  let feeTransferId: string | null = payment.platformFeeTransferId ?? null;
  let feeCollected = payment.platformFeeCollected;
  if (!feeCollected) {
    try {
      const fee = await collectPlatformFee({
        fromConnectedAccountId: args.sender.fa.stripeConnectedAccountId,
        fromFinancialAccountId: args.sender.fa.stripeFinancialAccountId,
        transferType: args.transferType,
        metadata: {
          paymentId: payment.id,
          contractorTransferId: transfer.id,
        },
      });
      feeTransferId = fee.feeTransferId;
      feeCollected = !!fee.feeTransferId;
    } catch (err) {
      console.error('[treasury-payments] fee sweep failed', err);
    }
  }

  await prisma.contractorPayment.update({
    where: { id: payment.id },
    data: {
      status: 'processing', // becomes 'paid' on treasury.outbound_transfer.posted
      treasuryTransferId: transfer.id,
      treasuryStatus: 'pending',
      platformFeeTransferId: feeTransferId,
      platformFeeCollected: feeCollected,
    },
  });

  return {
    success: true,
    paymentId: payment.id,
    treasuryTransferId: transfer.id,
    treasuryStatus: 'pending',
    contractorReceives: contractorAmountCents / 100,
    platformFee: MARKETPLACE_PLATFORM_FEE_CENTS / 100,
  };
}

function labelForType(t: TreasuryTransferType, _cashout: boolean): string {
  switch (t) {
    case 'single':
      return 'Marketplace job payment';
    case 'milestone':
      return 'Milestone release';
    case 'materials_advance':
      return 'Materials advance';
    case 'cashout':
      return 'Cashout to bank';
  }
}

// ────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────

/**
 * Single payment (instant book / direct hire). Landlord clicks "Pay" →
 * full amount moves to contractor wallet (minus $1).
 */
export async function executeSinglePayment(args: {
  amountCents: number;
  landlordId: string;
  contractorId?: string;
  contractorProfileId?: string;
  description?: string;
  metadata?: Record<string, string>;
  jobId?: string;
  jobKind?: 'work_order' | 'contractor_job';
  callerUserId?: string;
}): Promise<PaymentResult> {
  return _execute({ ...args, transferType: 'single' });
}

/**
 * Retry a failed contractor leg once (after the 60s backoff scheduled by
 * the webhook). Reuses the existing ContractorPayment row so the $1
 * platform fee is never re-collected — the row's `platformFeeCollected`
 * flag short-circuits the fee leg in `executeContractorLeg`.
 */
export async function retryMarketplacePayment(
  paymentId: string
): Promise<PaymentResult> {
  const existing = await prisma.contractorPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      transferType: true,
      landlordId: true,
      contractorId: true,
      milestoneRefId: true,
      milestoneRefType: true,
      workOrderId: true,
      retryCount: true,
    },
  });
  if (!existing) {
    return { success: false, reason: 'unknown', message: 'Payment not found.' };
  }
  if (existing.retryCount > 1) {
    return { success: false, reason: 'unknown', message: 'Already retried.' };
  }

  const transferType = existing.transferType as TreasuryTransferType | null;
  if (!transferType || transferType === 'cashout') {
    return { success: false, reason: 'unknown', message: 'Not retryable.' };
  }

  return _execute({
    amountCents: Math.round(Number(existing.amount) * 100),
    landlordId: existing.landlordId,
    contractorProfileId: existing.contractorId,
    transferType,
    jobId: existing.workOrderId ?? undefined,
    jobKind: existing.workOrderId ? 'work_order' : undefined,
    milestoneRefId: existing.milestoneRefId ?? undefined,
    milestoneRefType:
      (existing.milestoneRefType as
        | 'work_order_milestone'
        | 'job_milestone'
        | undefined) ?? undefined,
    existingPaymentId: existing.id,
  });
}

/**
 * Milestone release. Used by both WorkOrderMilestone and JobMilestone.
 * The caller passes the milestone id + which kind so the resulting
 * ContractorPayment row links back correctly.
 */
export async function releaseMilestoneViaTreasury(args: {
  amountCents: number;
  landlordId: string;
  contractorId?: string;
  contractorProfileId?: string;
  milestoneId: string;
  milestoneKind: 'work_order_milestone' | 'job_milestone';
  isMaterialsAdvance?: boolean;
  description?: string;
  jobId?: string;
  jobKind?: 'work_order' | 'contractor_job';
  callerUserId?: string;
}): Promise<PaymentResult> {
  return _execute({
    amountCents: args.amountCents,
    landlordId: args.landlordId,
    contractorId: args.contractorId,
    contractorProfileId: args.contractorProfileId,
    transferType: args.isMaterialsAdvance ? 'materials_advance' : 'milestone',
    description: args.description,
    jobId: args.jobId,
    jobKind: args.jobKind,
    callerUserId: args.callerUserId,
    milestoneRefId: args.milestoneId,
    milestoneRefType: args.milestoneKind,
    metadata: {
      milestoneId: args.milestoneId,
      milestoneKind: args.milestoneKind,
    },
  });
}

/**
 * Contractor cashout to their linked external bank. Always uses
 * Treasury OutboundTransfer (the right primitive for "pay myself").
 *
 * @param args.contractorProfileId  The marketplace profile that owns the
 *                                  Treasury wallet to draw from.
 */
export async function executeContractorCashout(args: {
  amountCents: number;
  contractorProfileId: string;
  externalAccountId: string; // Stripe ba_... id on the connected account
  callerUserId?: string;
}): Promise<PaymentResult> {
  if (args.amountCents < MARKETPLACE_MIN_CASHOUT_CENTS) {
    return {
      success: false,
      reason: 'amount_below_minimum',
      message: reasonToUserMessage('amount_below_minimum'),
    };
  }

  const profile = await prisma.contractorProfile.findUnique({
    where: { id: args.contractorProfileId },
    select: { id: true, userId: true },
  });
  if (!profile) {
    return { success: false, reason: 'sender_not_verified' };
  }

  const fa = await prisma.financialAccount.findFirst({
    where: { contractorId: profile.id, status: { in: ['pending', 'active'] } },
    select: {
      id: true,
      stripeFinancialAccountId: true,
      stripeConnectedAccountId: true,
    },
  });
  if (!fa) {
    await logFailedAttempt({
      userId: args.callerUserId,
      contractorId: profile.id,
      amount: args.amountCents / 100,
      transferType: 'cashout',
      reasonFailed: 'sender_no_wallet',
    });
    return { success: false, reason: 'sender_no_wallet' };
  }

  const live = await getLiveCashBalanceCents(fa);
  if (live < args.amountCents) {
    await logFailedAttempt({
      userId: args.callerUserId,
      contractorId: profile.id,
      amount: args.amountCents / 100,
      transferType: 'cashout',
      reasonFailed: 'insufficient_balance',
      errorDetail: `available=${live}cents need=${args.amountCents}cents`,
    });
    return { success: false, reason: 'insufficient_balance' };
  }

  // Confirm the external account belongs to this Connect account.
  try {
    await stripe.accounts.retrieveExternalAccount(
      fa.stripeConnectedAccountId,
      args.externalAccountId
    );
  } catch {
    await logFailedAttempt({
      userId: args.callerUserId,
      contractorId: profile.id,
      amount: args.amountCents / 100,
      transferType: 'cashout',
      reasonFailed: 'no_external_bank',
    });
    return { success: false, reason: 'no_external_bank' };
  }

  const netCents = args.amountCents - MARKETPLACE_PLATFORM_FEE_CENTS;
  if (netCents <= 0) {
    return { success: false, reason: 'invalid_amount' };
  }

  let transfer;
  try {
    transfer = await stripe.treasury.outboundTransfers.create(
      {
        financial_account: fa.stripeFinancialAccountId,
        amount: netCents,
        currency: 'usd',
        destination_payment_method: args.externalAccountId,
        description: 'Property Flow HQ cashout',
        statement_descriptor: 'PROPFLOW',
        metadata: {
          purpose: 'marketplace_cashout',
          contractorProfileId: profile.id,
        },
      },
      { stripeAccount: fa.stripeConnectedAccountId }
    );
  } catch (err: any) {
    await logFailedAttempt({
      userId: args.callerUserId,
      contractorId: profile.id,
      amount: args.amountCents / 100,
      transferType: 'cashout',
      reasonFailed: 'stripe_error',
      errorDetail: err?.message,
    });
    return {
      success: false,
      reason: 'stripe_error',
      message: err?.raw?.message || err?.message || 'Stripe rejected the cashout.',
    };
  }

  // Sweep the $1 cashout fee.
  let feeTransferId: string | null = null;
  try {
    const fee = await collectPlatformFee({
      fromConnectedAccountId: fa.stripeConnectedAccountId,
      fromFinancialAccountId: fa.stripeFinancialAccountId,
      transferType: 'cashout',
      metadata: {
        contractorProfileId: profile.id,
        cashoutTransferId: transfer.id,
      },
    });
    feeTransferId = fee.feeTransferId;
  } catch (err) {
    console.error('[treasury-payments] cashout fee sweep failed', err);
  }

  // Cashouts get a ContractorPayment row too — same audit trail for both
  // sides of money flow. landlordId is required NOT NULL on the model so
  // we point it at the contractor's own (synthetic) Landlord row if any,
  // or skip the row gracefully.
  // To stay clean: store the cashout in a separate location (we add to
  // the FinancialAccountTransaction on webhook anyway). Skip here.

  return {
    success: true,
    treasuryTransferId: transfer.id,
    treasuryStatus: 'pending',
    contractorReceives: netCents / 100,
    platformFee: MARKETPLACE_PLATFORM_FEE_CENTS / 100,
  };
}

/**
 * Internal entrypoint shared by single + milestone calls. Runs guard
 * rails first, logs failures to PaymentAttempt with a specific reason,
 * then executes the contractor leg.
 */
async function _execute(args: ExecuteParams): Promise<PaymentResult> {
  const guards = await checkGuardRails(args);
  if (guards.reason) {
    await logFailedAttempt({
      jobId: args.jobId,
      userId: args.callerUserId,
      landlordId: args.landlordId,
      contractorId: args.contractorProfileId,
      amount: args.amountCents / 100,
      transferType: args.transferType,
      reasonFailed: guards.reason,
      errorDetail: guards.detail,
    });
    return {
      success: false,
      reason: guards.reason,
      message: reasonToUserMessage(guards.reason),
    };
  }
  return executeContractorLeg({
    ...args,
    sender: guards.sender!,
    recipient: guards.recipient!,
  });
}
