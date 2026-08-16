/**
 * Stripe Issuing service for Property Flow HQ debit cards.
 *
 * One activation note up front: Stripe Issuing is a SEPARATE product
 * activation from Treasury. Treasury being live on the platform doesn't
 * automatically grant Issuing — the platform must apply for Issuing
 * (Stripe Dashboard → Issuing → Get started) and request the
 * `card_issuing` capability per connected user account.
 *
 * Every public function here calls Stripe with `stripeAccount` set to
 * the user's CONNECTED account. This keeps spend authorization tied to
 * the user's own Treasury balance, not the platform's.
 */

import 'server-only';
import Stripe from 'stripe';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';

// MCC categories Stripe Issuing knows about. We expose a subset that's
// useful as a "block list" for landlords/PMs (gambling, alcohol, etc).
// Names match the Stripe MCC enum exactly so they pass through the API.
export const BLOCKABLE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'gambling', label: 'Gambling' },
  { value: 'liquor_stores', label: 'Liquor Stores' },
  { value: 'bars', label: 'Bars & Nightclubs' },
  { value: 'tobacco_users_and_dispensaries', label: 'Tobacco / Cannabis' },
  { value: 'wires_money_orders', label: 'Money Orders / Wire Services' },
  { value: 'jewelry_stores_watches_clocks_and_silverware_stores', label: 'Jewelry' },
  { value: 'cigar_stores_and_stands', label: 'Cigar Stores' },
  { value: 'massage_parlors', label: 'Massage Parlors' },
];

// ────────────────────────────────────────────────────────────────────────
// Resolve which Connect account a user owns + their Treasury FA
// ────────────────────────────────────────────────────────────────────────

interface UserWalletContext {
  connectedAccountId: string;
  financialAccountId: string;
  internalFinancialAccountId: string; // our DB row id
  ownerType: 'landlord' | 'contractor';
  landlordId?: string;
  contractorProfileId?: string;
}

async function resolveWallet(userId: string): Promise<UserWalletContext | null> {
  // Prefer landlord wallet — landlord-owners need cards too.
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: userId },
    select: {
      id: true,
      stripeOnboardingStatus: true,
      stripeConnectAccountId: true,
    },
  });
  if (
    landlord?.stripeOnboardingStatus === 'verified' &&
    landlord.stripeConnectAccountId
  ) {
    const fa = await prisma.financialAccount.findFirst({
      where: { landlordId: landlord.id, status: { in: ['pending', 'active'] } },
      select: {
        id: true,
        stripeFinancialAccountId: true,
        stripeConnectedAccountId: true,
      },
    });
    if (fa) {
      return {
        connectedAccountId: fa.stripeConnectedAccountId,
        financialAccountId: fa.stripeFinancialAccountId,
        internalFinancialAccountId: fa.id,
        ownerType: 'landlord',
        landlordId: landlord.id,
      };
    }
  }

  // Otherwise contractor.
  const profile = await prisma.contractorProfile.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (profile) {
    const fa = await prisma.financialAccount.findFirst({
      where: { contractorId: profile.id, status: { in: ['pending', 'active'] } },
      select: {
        id: true,
        stripeFinancialAccountId: true,
        stripeConnectedAccountId: true,
      },
    });
    if (fa) {
      return {
        connectedAccountId: fa.stripeConnectedAccountId,
        financialAccountId: fa.stripeFinancialAccountId,
        internalFinancialAccountId: fa.id,
        ownerType: 'contractor',
        contractorProfileId: profile.id,
      };
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Cardholder — one per Connect account
// ────────────────────────────────────────────────────────────────────────

interface CardholderInput {
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: 'US';
  };
}

/**
 * Find or create the user's Stripe Issuing cardholder. Idempotent — once
 * created, the cardholder row is reused for every subsequent card request.
 */
export async function getOrCreateCardholder(
  input: CardholderInput
): Promise<{ id: string; stripeCardholderId: string; connectedAccountId: string }> {
  const existing = await prisma.issuingCardholder.findFirst({
    where: { userId: input.userId },
    select: { id: true, stripeCardholderId: true, stripeConnectedAccountId: true },
  });
  if (existing) {
    return {
      id: existing.id,
      stripeCardholderId: existing.stripeCardholderId,
      connectedAccountId: existing.stripeConnectedAccountId,
    };
  }

  const ctx = await resolveWallet(input.userId);
  if (!ctx) {
    throw new IssuingError(
      'wallet_not_ready',
      'Finish identity verification before requesting a card.'
    );
  }

  // Make sure the connected account has card_issuing capability requested.
  // No-op on accounts that already have it.
  try {
    await stripe.accounts.update(ctx.connectedAccountId, {
      capabilities: { card_issuing: { requested: true } },
    });
  } catch (err: any) {
    // Most common reason: platform itself isn't approved for Issuing yet.
    if (
      typeof err?.message === 'string' &&
      /issuing/i.test(err.message) &&
      /not enabled|not activated|not authorized/i.test(err.message)
    ) {
      throw new IssuingError(
        'platform_not_enabled',
        'Stripe Issuing is not yet activated on this Property Flow HQ account. We will email you when it is ready.'
      );
    }
    // Non-fatal otherwise — continue and let cardholder create surface
    // the real reason if any.
  }

  const cardholder = await stripe.issuing.cardholders.create(
    {
      type: 'individual',
      name: input.fullName,
      email: input.email,
      phone_number: input.phone || undefined,
      billing: { address: input.shippingAddress },
    },
    { stripeAccount: ctx.connectedAccountId }
  );

  const row = await prisma.issuingCardholder.create({
    data: {
      userId: input.userId,
      landlordId: ctx.landlordId,
      contractorProfileId: ctx.contractorProfileId,
      stripeConnectedAccountId: ctx.connectedAccountId,
      stripeCardholderId: cardholder.id,
      status: cardholder.status,
    },
    select: { id: true, stripeCardholderId: true, stripeConnectedAccountId: true },
  });
  return {
    id: row.id,
    stripeCardholderId: row.stripeCardholderId,
    connectedAccountId: row.stripeConnectedAccountId,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Card creation
// ────────────────────────────────────────────────────────────────────────

interface RequestCardInput {
  userId: string;
  type: 'virtual' | 'physical';
  shippingAddress?: CardholderInput['shippingAddress'];
}

export async function requestCardForUser(
  input: RequestCardInput
): Promise<{ cardId: string; stripeCardId: string; type: 'virtual' | 'physical' }> {
  const ctx = await resolveWallet(input.userId);
  if (!ctx) {
    throw new IssuingError(
      'wallet_not_ready',
      'Finish identity verification before requesting a card.'
    );
  }

  // Only issue cards to verified users. resolveWallet already gates on
  // stripeOnboardingStatus='verified' for landlords; we double-check for
  // contractors below.
  if (ctx.ownerType === 'contractor') {
    const profile = await prisma.contractorProfile.findUnique({
      where: { id: ctx.contractorProfileId! },
      // ContractorProfile doesn't track a verified flag the same way;
      // we treat presence of an active FinancialAccount as "verified."
      select: { id: true },
    });
    if (!profile) {
      throw new IssuingError('wallet_not_ready', 'Contractor wallet not found.');
    }
  }

  // Resolve user identity for cardholder.
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      name: true,
      email: true,
      phoneNumber: true,
      shippingAddress: true,
    },
  });
  if (!user?.email) {
    throw new IssuingError('missing_user_data', 'User email is required.');
  }

  const shipping =
    input.shippingAddress ||
    (user.shippingAddress as CardholderInput['shippingAddress'] | null);
  if (!shipping?.line1 || !shipping.city || !shipping.state || !shipping.postal_code) {
    throw new IssuingError(
      'missing_address',
      'Shipping address is required (street, city, state, ZIP).'
    );
  }

  const cardholder = await getOrCreateCardholder({
    userId: input.userId,
    fullName: user.name,
    email: user.email,
    phone: user.phoneNumber,
    shippingAddress: shipping,
  });

  const card = await stripe.issuing.cards.create(
    {
      cardholder: cardholder.stripeCardholderId,
      currency: 'usd',
      type: input.type,
      financial_account: ctx.financialAccountId,
      status: 'active',
      // Spending controls — defaults restrict cash-like and adult MCCs.
      // Users can later add specific category blocks via /api/cards/limits.
      spending_controls: {
        blocked_categories: ['gambling', 'wires_money_orders'],
      },
      ...(input.type === 'physical'
        ? {
            shipping: {
              name: user.name,
              address: shipping,
              service: 'standard',
            },
          }
        : {}),
      metadata: {
        userId: input.userId,
        platform: 'propertyflowhq',
      },
    },
    { stripeAccount: cardholder.connectedAccountId }
  );

  const row = await prisma.issuingCard.create({
    data: {
      cardholderId: cardholder.id,
      userId: input.userId,
      landlordId: ctx.landlordId,
      contractorProfileId: ctx.contractorProfileId,
      financialAccountId: ctx.internalFinancialAccountId,
      stripeConnectedAccountId: cardholder.connectedAccountId,
      stripeCardId: card.id,
      type: input.type,
      status: card.status,
      last4: card.last4 ?? null,
      brand: card.brand ?? null,
      expMonth: card.exp_month ?? null,
      expYear: card.exp_year ?? null,
      shippingStatus:
        input.type === 'physical' ? card.shipping?.status ?? 'pending' : null,
      shippingCarrier: card.shipping?.carrier ?? null,
      shippingTrackingNumber: card.shipping?.tracking_number ?? null,
      blockedCategories: ['gambling', 'wires_money_orders'],
    },
    select: { id: true },
  });

  return { cardId: row.id, stripeCardId: card.id, type: input.type };
}

// ────────────────────────────────────────────────────────────────────────
// Freeze / unfreeze
// ────────────────────────────────────────────────────────────────────────

export async function setCardFrozen(
  userId: string,
  cardId: string,
  frozen: boolean
): Promise<void> {
  const card = await getOwnedCard(userId, cardId);
  await stripe.issuing.cards.update(
    card.stripeCardId,
    { status: frozen ? 'inactive' : 'active' },
    { stripeAccount: card.stripeConnectedAccountId }
  );
  await prisma.issuingCard.update({
    where: { id: card.id },
    data: { frozen, status: frozen ? 'inactive' : 'active' },
  });
}

// ────────────────────────────────────────────────────────────────────────
// Spend limits + blocked categories
// ────────────────────────────────────────────────────────────────────────

export async function updateCardLimits(
  userId: string,
  cardId: string,
  args: { monthlyLimitCents?: number | null; blockedCategories?: string[] }
): Promise<void> {
  const card = await getOwnedCard(userId, cardId);

  const spending_controls: Stripe.Issuing.CardUpdateParams.SpendingControls = {};
  if (typeof args.monthlyLimitCents === 'number' && args.monthlyLimitCents > 0) {
    spending_controls.spending_limits = [
      {
        amount: args.monthlyLimitCents,
        interval: 'monthly',
      },
    ];
  } else if (args.monthlyLimitCents === null) {
    spending_controls.spending_limits = [];
  }
  if (args.blockedCategories) {
    spending_controls.blocked_categories =
      args.blockedCategories as Stripe.Issuing.CardUpdateParams.SpendingControls.BlockedCategory[];
  }

  await stripe.issuing.cards.update(
    card.stripeCardId,
    { spending_controls },
    { stripeAccount: card.stripeConnectedAccountId }
  );

  await prisma.issuingCard.update({
    where: { id: card.id },
    data: {
      monthlyLimitCents:
        args.monthlyLimitCents === null
          ? null
          : args.monthlyLimitCents !== undefined
            ? BigInt(args.monthlyLimitCents)
            : undefined,
      blockedCategories: args.blockedCategories ?? undefined,
    },
  });
}

// ────────────────────────────────────────────────────────────────────────
// Reveal (full PAN + CVV) — caller MUST verify 2FA before invoking
// ────────────────────────────────────────────────────────────────────────

/**
 * Returns a Stripe-issued ephemeral key the client uses to retrieve the
 * full card details directly from Stripe (Stripe.js + Issuing Elements).
 * The key is single-use and short-lived. We never see the PAN/CVV.
 */
export async function createCardEphemeralKey(
  userId: string,
  cardId: string
): Promise<{ ephemeralKey: string; cardId: string; nonce?: string }> {
  const card = await getOwnedCard(userId, cardId);
  const key = await stripe.ephemeralKeys.create(
    { issuing_card: card.stripeCardId },
    {
      stripeAccount: card.stripeConnectedAccountId,
      apiVersion: '2025-02-24.acacia',
    }
  );
  return { ephemeralKey: key.secret!, cardId: card.stripeCardId };
}

// ────────────────────────────────────────────────────────────────────────
// Read helpers
// ────────────────────────────────────────────────────────────────────────

export async function listCardsForUser(userId: string) {
  return prisma.issuingCard.findMany({
    where: { userId, status: { not: 'canceled' } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listCardActivity(userId: string, cardId: string, limit = 25) {
  const card = await getOwnedCard(userId, cardId);
  const [authorizations, transactions] = await Promise.all([
    prisma.issuingAuthorization.findMany({
      where: { cardId: card.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.issuingTransaction.findMany({
      where: { cardId: card.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);
  return { authorizations, transactions };
}

async function getOwnedCard(userId: string, cardId: string) {
  const card = await prisma.issuingCard.findUnique({ where: { id: cardId } });
  if (!card || card.userId !== userId) {
    throw new IssuingError('card_not_found', 'Card not found.');
  }
  return card;
}

// ────────────────────────────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────────────────────────────

export type IssuingErrorCode =
  | 'wallet_not_ready'
  | 'platform_not_enabled'
  | 'missing_user_data'
  | 'missing_address'
  | 'card_not_found'
  | 'unauthorized';

export class IssuingError extends Error {
  constructor(
    public code: IssuingErrorCode,
    public userMessage: string
  ) {
    super(userMessage);
  }
}
