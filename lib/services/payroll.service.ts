/*
 * V2 — W2 PAYROLL (GUSTO INTEGRATION)
 * =====================================
 * Insert Gusto API integration here to support
 * W2 employees with full tax withholding.
 *
 * Gusto API docs: https://docs.gusto.com
 * Required: Federal/state withholding calculations,
 * W2 generation, 941 filings, benefits deductions.
 *
 * Current model: 1099 independent contractors only.
 * No withholding. Stripe handles 1099-NEC at year end.
 */

/**
 * Treasury payroll service for landlord/PM team members.
 *
 * Same execution pattern as the marketplace payment service:
 *   - Landlord wallet → team-member wallet, OutboundPayment via ABA.
 *   - $1 platform fee per payment to Property Flow HQ's Treasury account.
 *   - All money decisions made BEFORE the Stripe call. Guard rails are
 *     enforced explicitly so we always return a specific user message.
 *
 * v1 only handles 1099 contractor payments. No withholding, no 941, no
 * deductions. The Gusto comment block at the top is the integration
 * point for v2 W2 payroll.
 */

import 'server-only';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { logFinancialEvent } from '@/lib/security/audit-logger';

// ────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────

/** Single $1 fee per payment, same as marketplace. */
export const PAYROLL_PLATFORM_FEE_CENTS = 100;

/** 40-hour weekly threshold for OT calculation flag (full-tier only). */
export const PAYROLL_OVERTIME_WEEKLY_THRESHOLD = 40;

/** Default OT multiplier (1.5x) — Enterprise only applies it. */
export const PAYROLL_DEFAULT_OT_MULTIPLIER = 1.5;

// ────────────────────────────────────────────────────────────────────────
// Pay calculation
// ────────────────────────────────────────────────────────────────────────

export interface PayCalculation {
  /** Whole hours worked (regular only). */
  regularHours: number;
  /** Overtime hours (only computed when applyOvertime=true). */
  overtimeHours: number;
  hourlyRate: number;
  /** OT multiplier applied to overtimeHours. */
  overtimeMultiplier: number;
  /** Pay for regular hours only. */
  regularPay: number;
  /** Pay for overtime hours, including the multiplier. */
  overtimePay: number;
  /** Sum of regularPay + overtimePay. The amount that leaves the wallet
   *  before the platform fee — the "Gross" line in the confirmation modal. */
  grossPay: number;
  /** Constant — platform fee in dollars. */
  platformFee: number;
  /** What the team member will receive after the $1 fee. */
  netPay: number;
  /** Total deducted from the PM's wallet (grossPay + platformFee). */
  walletDeduction: number;
}

/**
 * Compute pay for an approved timesheet. The flag for OT is set per the
 * caller's plan — Pro doesn't apply OT in v1, Enterprise does.
 *
 * Inputs are kept as plain numbers here; callers convert from the
 * timesheet's Decimal hour totals + the team member's hourlyRate.
 */
export function calculatePay(input: {
  totalHours: number;
  hourlyRate: number;
  applyOvertime: boolean;
  overtimeMultiplier?: number;
  weeklyThreshold?: number;
}): PayCalculation {
  const totalHours = Math.max(0, input.totalHours);
  const hourlyRate = Math.max(0, input.hourlyRate);
  const overtimeMultiplier =
    input.overtimeMultiplier ?? PAYROLL_DEFAULT_OT_MULTIPLIER;
  const threshold = input.weeklyThreshold ?? PAYROLL_OVERTIME_WEEKLY_THRESHOLD;

  let regularHours = totalHours;
  let overtimeHours = 0;

  if (input.applyOvertime && totalHours > threshold) {
    regularHours = threshold;
    overtimeHours = totalHours - threshold;
  }

  const regularPay = round2(regularHours * hourlyRate);
  const overtimePay = round2(overtimeHours * hourlyRate * overtimeMultiplier);
  const grossPay = round2(regularPay + overtimePay);
  const platformFee = PAYROLL_PLATFORM_FEE_CENTS / 100;
  const netPay = round2(grossPay - platformFee);
  const walletDeduction = grossPay; // PM's wallet only loses gross; fee
  // is taken out of the contractor's leg, NOT charged on top — same
  // model as marketplace ("$1 fee per payment").

  return {
    regularHours,
    overtimeHours,
    hourlyRate,
    overtimeMultiplier,
    regularPay,
    overtimePay,
    grossPay,
    platformFee,
    netPay,
    walletDeduction,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ────────────────────────────────────────────────────────────────────────
// Wallet resolution helpers (mirror of marketplace service)
// ────────────────────────────────────────────────────────────────────────

async function getLandlordWallet(landlordId: string) {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: {
      id: true,
      ownerUserId: true,
      stripeOnboardingStatus: true,
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

async function getTeamMemberWallet(teamMemberId: string) {
  const tm = await prisma.teamMember.findUnique({
    where: { id: teamMemberId },
    select: {
      id: true,
      landlordId: true,
      compensation: {
        select: {
          stripeConnectAccountId: true,
          stripeFinancialAccountId: true,
          treasuryOnboardingStatus: true,
          treasuryEnabled: true,
        },
      },
    },
  });
  if (!tm?.compensation) return null;
  if (tm.compensation.treasuryOnboardingStatus !== 'verified') return null;
  if (
    !tm.compensation.stripeConnectAccountId ||
    !tm.compensation.stripeFinancialAccountId
  ) {
    return null;
  }
  return {
    teamMember: tm,
    connectedAccountId: tm.compensation.stripeConnectAccountId,
    financialAccountId: tm.compensation.stripeFinancialAccountId,
  };
}

async function getRecipientAba(opts: {
  stripeFinancialAccountId: string;
  stripeConnectedAccountId: string;
}): Promise<{ routing_number: string; account_number: string } | null> {
  const fa = await stripe.treasury.financialAccounts.retrieve(
    opts.stripeFinancialAccountId,
    { expand: ['financial_addresses'] },
    { stripeAccount: opts.stripeConnectedAccountId }
  );
  const aba = fa.financial_addresses?.find((a) => a.type === 'aba')?.aba;
  if (!aba?.account_number || !aba.routing_number) return null;
  return { routing_number: aba.routing_number, account_number: aba.account_number };
}

async function getLiveBalanceCents(opts: {
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

function getPlatformFeeAccount(): {
  financialAccountId: string;
  connectedAccountId: string;
} | null {
  const fa = process.env.STRIPE_PLATFORM_TREASURY_ACCOUNT_ID;
  const conn = process.env.STRIPE_PLATFORM_CONNECTED_ACCOUNT_ID;
  if (!fa || !conn) return null;
  return { financialAccountId: fa, connectedAccountId: conn };
}

async function collectPlatformFee(opts: {
  fromConnectedAccountId: string;
  fromFinancialAccountId: string;
  metadata: Record<string, string>;
}): Promise<{ feeTransferId: string | null }> {
  const dest = getPlatformFeeAccount();
  if (!dest) return { feeTransferId: null };

  const aba = await getRecipientAba({
    stripeFinancialAccountId: dest.financialAccountId,
    stripeConnectedAccountId: dest.connectedAccountId,
  });
  if (!aba) return { feeTransferId: null };

  const fee = await stripe.treasury.outboundPayments.create(
    {
      financial_account: opts.fromFinancialAccountId,
      amount: PAYROLL_PLATFORM_FEE_CENTS,
      currency: 'usd',
      description: 'Property Flow HQ payroll platform fee',
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
      metadata: { ...opts.metadata, purpose: 'payroll_platform_fee' },
    },
    { stripeAccount: opts.fromConnectedAccountId }
  );
  return { feeTransferId: fee.id };
}

// ────────────────────────────────────────────────────────────────────────
// Pay execution
// ────────────────────────────────────────────────────────────────────────

export type PayrollFailureReason =
  | 'unauthorized'
  | 'plan_required'
  | 'wrong_status'
  | 'missing_rate'
  | 'team_member_not_verified'
  | 'sender_wallet_not_ready'
  | 'recipient_wallet_not_ready'
  | 'insufficient_balance'
  | 'invalid_amount'
  | 'already_paid'
  | 'stripe_error';

export interface PayResult {
  success: boolean;
  paymentId?: string;
  treasuryTransferId?: string;
  treasuryStatus?: 'pending' | 'posted' | 'failed';
  netPay?: number;
  grossPay?: number;
  platformFee?: number;
  reason?: PayrollFailureReason;
  message?: string;
}

export function reasonToMessage(reason: PayrollFailureReason): string {
  switch (reason) {
    case 'unauthorized':
      return 'Not authorized to run payroll.';
    case 'plan_required':
      return 'Payroll requires the Pro or Enterprise plan.';
    case 'wrong_status':
      return 'Only approved timesheets can be paid.';
    case 'missing_rate':
      return 'Set an hourly rate for this team member before paying.';
    case 'team_member_not_verified':
      return 'Team member must finish identity verification before they can be paid.';
    case 'sender_wallet_not_ready':
      return 'Your wallet is not yet ready. Finish verification first.';
    case 'recipient_wallet_not_ready':
      return "The team member's Treasury wallet is not yet ready to receive payments.";
    case 'insufficient_balance':
      return 'Insufficient wallet balance for this payment plus the $1 fee.';
    case 'invalid_amount':
      return 'Pay amount must be greater than the $1 platform fee.';
    case 'already_paid':
      return 'This timesheet has already been paid.';
    case 'stripe_error':
      return 'Stripe rejected the transfer. Please try again.';
  }
}

interface ExecutePayInput {
  timesheetId: string;
  applyOvertime: boolean; // true on Enterprise
  callerUserId: string;
}

/**
 * Execute payroll for a single approved timesheet. Idempotent — if a
 * TeamPayment already exists for the timesheet and Stripe rejected the
 * first attempt, we reuse it (so the $1 fee is never re-collected).
 */
export async function executeTimesheetPayment(
  input: ExecutePayInput
): Promise<PayResult> {
  const ts = await prisma.timesheet.findUnique({
    where: { id: input.timesheetId },
    select: {
      id: true,
      landlordId: true,
      teamMemberId: true,
      totalHours: true,
      regularHours: true,
      overtimeHours: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      payment: { select: { id: true, status: true, treasuryStatus: true } },
      teamMember: {
        select: { id: true, hourlyRate: true, userId: true, landlordId: true },
      },
    },
  });

  if (!ts) {
    return { success: false, reason: 'wrong_status', message: 'Timesheet not found.' };
  }
  if (ts.status !== 'approved') {
    return { success: false, reason: 'wrong_status', message: reasonToMessage('wrong_status') };
  }
  if (ts.payment && ts.payment.status === 'completed') {
    return { success: false, reason: 'already_paid', message: reasonToMessage('already_paid') };
  }

  const hourlyRate = Number(ts.teamMember.hourlyRate ?? 0);
  if (hourlyRate <= 0) {
    return { success: false, reason: 'missing_rate', message: reasonToMessage('missing_rate') };
  }

  const calc = calculatePay({
    totalHours: Number(ts.totalHours),
    hourlyRate,
    applyOvertime: input.applyOvertime,
  });

  if (calc.grossPay <= calc.platformFee) {
    return { success: false, reason: 'invalid_amount', message: reasonToMessage('invalid_amount') };
  }

  // Resolve wallets
  const [sender, recipient] = await Promise.all([
    getLandlordWallet(ts.landlordId),
    getTeamMemberWallet(ts.teamMemberId),
  ]);
  if (!sender) {
    return {
      success: false,
      reason: 'sender_wallet_not_ready',
      message: reasonToMessage('sender_wallet_not_ready'),
    };
  }
  if (!recipient) {
    return {
      success: false,
      reason: 'recipient_wallet_not_ready',
      message: reasonToMessage('recipient_wallet_not_ready'),
    };
  }

  // Live balance check.
  const live = await getLiveBalanceCents(sender.fa);
  const grossCents = Math.round(calc.grossPay * 100);
  if (live < grossCents) {
    return {
      success: false,
      reason: 'insufficient_balance',
      message: reasonToMessage('insufficient_balance'),
    };
  }

  // Recipient ABA.
  const aba = await getRecipientAba({
    stripeFinancialAccountId: recipient.financialAccountId,
    stripeConnectedAccountId: recipient.connectedAccountId,
  });
  if (!aba) {
    return {
      success: false,
      reason: 'recipient_wallet_not_ready',
      message: reasonToMessage('recipient_wallet_not_ready'),
    };
  }

  // Use existing TeamPayment row if present (retry path), else create one.
  let payment;
  if (ts.payment) {
    payment = await prisma.teamPayment.findUnique({
      where: { id: ts.payment.id },
    });
    if (payment) {
      payment = await prisma.teamPayment.update({
        where: { id: payment.id },
        data: { status: 'processing' },
      });
    }
  }
  if (!payment) {
    payment = await prisma.teamPayment.create({
      data: {
        landlordId: ts.landlordId,
        teamMemberId: ts.teamMemberId,
        timesheetId: ts.id,
        paymentType: 'timesheet',
        transferType: 'timesheet',
        grossAmount: calc.grossPay,
        platformFee: calc.platformFee,
        netAmount: calc.netPay,
        regularPay: calc.regularPay,
        overtimePay: calc.overtimePay,
        regularHoursAtPay: calc.regularHours,
        overtimeHoursAtPay: calc.overtimeHours,
        hourlyRateAtPay: calc.hourlyRate,
        overtimeMultiplierAtPay: calc.overtimeMultiplier,
        status: 'processing',
        treasuryStatus: 'pending',
      },
    });
  }

  // Net leg — money flows landlord wallet → team member wallet.
  const netCents = Math.round(calc.netPay * 100);
  let transfer;
  try {
    transfer = await stripe.treasury.outboundPayments.create(
      {
        financial_account: sender.fa.stripeFinancialAccountId,
        amount: netCents,
        currency: 'usd',
        description: `Payroll: ${ts.periodStart.toISOString().slice(0, 10)} - ${ts.periodEnd.toISOString().slice(0, 10)}`,
        statement_descriptor: 'PROPFLOW PAY',
        destination_payment_method_data: {
          type: 'us_bank_account',
          us_bank_account: {
            routing_number: aba.routing_number,
            account_number: aba.account_number,
            account_holder_type: 'individual',
          },
          billing_details: { name: 'Team member payroll' },
        },
        metadata: {
          paymentId: payment.id,
          teamPaymentId: payment.id,
          landlordId: ts.landlordId,
          teamMemberId: ts.teamMemberId,
          timesheetId: ts.id,
          source: 'payroll.timesheet',
        },
      },
      { stripeAccount: sender.fa.stripeConnectedAccountId }
    );
  } catch (err: any) {
    await prisma.teamPayment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        treasuryStatus: 'failed',
        failureReason: (err?.message || '').slice(0, 200),
      },
    });
    return {
      success: false,
      reason: 'stripe_error',
      message:
        err?.raw?.message || err?.message || reasonToMessage('stripe_error'),
    };
  }

  // Sweep $1 fee — best-effort, doesn't fail the payroll if the platform
  // FA env vars aren't set yet. Skipped on retry (idempotent).
  let feeTransferId: string | null = payment.platformFeeTransferId ?? null;
  let feeCollected = payment.platformFeeCollected;
  if (!feeCollected) {
    try {
      const fee = await collectPlatformFee({
        fromConnectedAccountId: sender.fa.stripeConnectedAccountId,
        fromFinancialAccountId: sender.fa.stripeFinancialAccountId,
        metadata: {
          paymentId: payment.id,
          netTransferId: transfer.id,
          source: 'payroll.timesheet',
        },
      });
      feeTransferId = fee.feeTransferId;
      feeCollected = !!fee.feeTransferId;
    } catch (err) {
      console.error('[payroll] fee sweep failed', err);
    }
  }

  // Persist transfer ids.
  await prisma.teamPayment.update({
    where: { id: payment.id },
    data: {
      stripeTransferId: transfer.id, // legacy column, also set for back-compat
      treasuryTransferId: transfer.id,
      treasuryStatus: 'pending',
      platformFeeTransferId: feeTransferId,
      platformFeeCollected: feeCollected,
    },
  });

  // Audit log — financial action.
  logFinancialEvent('PAYMENT_INITIATED', {
    userId: input.callerUserId,
    landlordId: ts.landlordId,
    amount: calc.grossPay,
    currency: 'USD',
    transactionId: transfer.id,
    paymentMethod: 'treasury_outbound_payment',
    additionalData: {
      paymentId: payment.id,
      teamMemberId: ts.teamMemberId,
      timesheetId: ts.id,
      source: 'payroll.timesheet',
    },
  }).catch(() => {});

  // Notify team member (in-app).
  if (ts.teamMember.userId) {
    try {
      await prisma.notification.create({
        data: {
          userId: ts.teamMember.userId,
          type: 'payroll_payment',
          title: '💸 Payroll on the way',
          message: `$${calc.netPay.toFixed(2)} for ${ts.periodStart.toISOString().slice(0, 10)} – ${ts.periodEnd.toISOString().slice(0, 10)} is being deposited to your wallet.`,
          actionUrl: '/employee/pay',
        },
      });
    } catch (err) {
      console.error('[payroll] notify team member failed', err);
    }
  }

  return {
    success: true,
    paymentId: payment.id,
    treasuryTransferId: transfer.id,
    treasuryStatus: 'pending',
    grossPay: calc.grossPay,
    netPay: calc.netPay,
    platformFee: calc.platformFee,
  };
}

// ────────────────────────────────────────────────────────────────────────
// "Payroll Ready" check — replaces the cron we cannot run on Hobby plan
// ────────────────────────────────────────────────────────────────────────

/**
 * Returns the team members whose pay schedule date is today or earlier
 * AND who have at least one approved unpaid timesheet. Called from a
 * lightweight on-page-load endpoint (never a cron job).
 */
export async function getDuePayrollItems(landlordId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueMembers = await prisma.teamMember.findMany({
    where: {
      landlordId,
      paySchedule: { not: null },
      paySchedulePayDate: { lte: today },
      status: 'active',
    },
    select: {
      id: true,
      paySchedule: true,
      paySchedulePayDate: true,
      hourlyRate: true,
      user: { select: { name: true } },
      timesheets: {
        where: {
          status: 'approved',
          payment: null,
        },
        select: {
          id: true,
          totalHours: true,
          periodStart: true,
          periodEnd: true,
        },
      },
    },
  });

  return dueMembers
    .filter((m) => m.timesheets.length > 0)
    .map((m) => ({
      teamMemberId: m.id,
      teamMemberName: m.user?.name || 'Team member',
      paySchedule: m.paySchedule!,
      paySchedulePayDate: m.paySchedulePayDate,
      pendingTimesheets: m.timesheets.length,
      pendingHours: m.timesheets.reduce((s, t) => s + Number(t.totalHours), 0),
    }));
}

// ────────────────────────────────────────────────────────────────────────
// 1099 threshold — annual earnings rollup
// ────────────────────────────────────────────────────────────────────────

/**
 * Returns total YTD earnings for the team member (calendar year, posted
 * payments only — pending payments don't count toward 1099 threshold).
 */
export async function getYtdEarnings(teamMemberId: string): Promise<number> {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const result = await prisma.teamPayment.aggregate({
    where: {
      teamMemberId,
      treasuryStatus: 'posted',
      paidAt: { gte: yearStart },
    },
    _sum: { grossAmount: true },
  });
  return Number(result._sum.grossAmount ?? 0);
}

/**
 * Bulk variant for the payroll history page — single query.
 */
export async function getYtdEarningsForLandlord(
  landlordId: string
): Promise<Map<string, number>> {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const rows = await prisma.teamPayment.groupBy({
    by: ['teamMemberId'],
    where: {
      landlordId,
      treasuryStatus: 'posted',
      paidAt: { gte: yearStart },
    },
    _sum: { grossAmount: true },
  });
  const map = new Map<string, number>();
  rows.forEach((r) => {
    map.set(r.teamMemberId, Number(r._sum.grossAmount ?? 0));
  });
  return map;
}


// ────────────────────────────────────────────────────────────────────────
// Team-member Treasury financial account provisioning
// ────────────────────────────────────────────────────────────────────────

/**
 * Ensure the team member has a Treasury financial account once the
 * Connect account is verified. Same shape as
 * `ensureFinancialAccountForLandlord` but writes to TeamMemberCompensation
 * instead of the Landlord row. Idempotent — safe to call on every
 * `account.updated` webhook.
 */
export async function ensureFinancialAccountForTeamMember(
  teamMemberId: string
): Promise<void> {
  const tm = await prisma.teamMember.findUnique({
    where: { id: teamMemberId },
    select: {
      compensation: {
        select: {
          id: true,
          stripeConnectAccountId: true,
          stripeFinancialAccountId: true,
          treasuryEnabled: true,
        },
      },
    },
  });

  const comp = tm?.compensation;
  if (!comp?.stripeConnectAccountId) return;
  if (comp.stripeFinancialAccountId) return; // already provisioned

  const list = await stripe.treasury.financialAccounts.list(
    { limit: 1 },
    { stripeAccount: comp.stripeConnectAccountId }
  );
  const fa =
    list.data[0] ??
    (await stripe.treasury.financialAccounts.create(
      {
        supported_currencies: ['usd'],
        features: {
          financial_addresses: { aba: { requested: true } },
          deposit_insurance: { requested: true },
          inbound_transfers: { ach: { requested: true } },
          outbound_transfers: {
            ach: { requested: true },
            us_domestic_wire: { requested: true },
          },
          outbound_payments: {
            ach: { requested: true },
            us_domestic_wire: { requested: true },
          },
          intra_stripe_flows: { requested: true },
        },
        metadata: {
          teamMemberId,
          bankName: 'Property Flow Wallet',
        },
      },
      { stripeAccount: comp.stripeConnectAccountId }
    ));

  await prisma.teamMemberCompensation.update({
    where: { id: comp.id },
    data: {
      stripeFinancialAccountId: fa.id,
      treasuryEnabled: true,
      treasuryVerifiedAt: new Date(),
    },
  });
}
