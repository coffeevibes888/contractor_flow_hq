/**
 * GET /api/wallet/transactions
 *
 * Returns paginated Treasury transactions, pulled live from Stripe so the
 * dashboard never serves stale state. Supports filtering by direction and
 * status via query params, and cursor-based pagination via Stripe's
 * `starting_after` cursor (the wallet UI hands us back the last id from
 * the previous page).
 *
 * Query:
 *   ?limit=20            (default 20, max 100)
 *   ?starting_after=tx_  (Stripe transaction id from previous page)
 *   ?filter=in|out|pending|all   (default 'all')
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { stripe } from '@/lib/stripe';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import type Stripe from 'stripe';

export type WalletTxFilter = 'all' | 'in' | 'out' | 'pending';

export interface WalletTransactionRow {
  id: string;
  /** Stripe `flow_type` normalized for our UI badges. */
  flow:
    | 'inbound_transfer'
    | 'outbound_transfer'
    | 'outbound_payment'
    | 'received_credit'
    | 'received_debit'
    | 'issuing_authorization'
    | 'other';
  /** 'in' (positive) or 'out' (negative) — derived from raw amount sign. */
  direction: 'in' | 'out';
  /** Always positive for display. */
  amount: number;
  status: 'open' | 'posted' | 'void';
  description: string;
  /** Counterparty name when available. */
  counterparty: string | null;
  /** ISO 8601. */
  createdAt: string;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransactionRow[];
  hasMore: boolean;
  nextCursor: string | null;
}

const FLOW_MAP: Record<string, WalletTransactionRow['flow']> = {
  inbound_transfer: 'inbound_transfer',
  outbound_transfer: 'outbound_transfer',
  outbound_payment: 'outbound_payment',
  received_credit: 'received_credit',
  received_debit: 'received_debit',
  issuing_authorization: 'issuing_authorization',
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { error: landlordResult.message || 'Landlord not found' },
        { status: 404 }
      );
    }

    const fa = await prisma.financialAccount.findFirst({
      where: {
        landlordId: landlordResult.landlord.id,
        status: { in: ['pending', 'active'] },
      },
    });
    if (!fa) {
      const empty: WalletTransactionsResponse = {
        transactions: [],
        hasMore: false,
        nextCursor: null,
      };
      return NextResponse.json(empty);
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get('limit') || '20', 10))
    );
    const startingAfter = searchParams.get('starting_after') || undefined;
    const filter = (searchParams.get('filter') || 'all') as WalletTxFilter;

    // Stripe Treasury transactions are pulled in pages of `limit` from the
    // financial account. We over-fetch slightly so the post-filter view
    // can still hit `limit` rows when the user picks "money in" only.
    const fetchLimit = filter === 'all' ? limit : Math.min(limit * 3, 100);
    const txs = await stripe.treasury.transactions.list(
      {
        financial_account: fa.stripeFinancialAccountId,
        limit: fetchLimit,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      { stripeAccount: fa.stripeConnectedAccountId }
    );

    const rows: WalletTransactionRow[] = txs.data.map((tx) => normalize(tx));

    let filtered = rows;
    if (filter === 'in') {
      filtered = rows.filter((r) => r.direction === 'in');
    } else if (filter === 'out') {
      filtered = rows.filter((r) => r.direction === 'out');
    } else if (filter === 'pending') {
      filtered = rows.filter((r) => r.status === 'open');
    }

    const limited = filtered.slice(0, limit);
    const payload: WalletTransactionsResponse = {
      transactions: limited,
      hasMore: txs.has_more && limited.length === limit,
      nextCursor: limited.length > 0 ? limited[limited.length - 1].id : null,
    };
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    console.error('[wallet/transactions] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not load transactions.' },
      { status: 500 }
    );
  }
}

function normalize(tx: Stripe.Treasury.Transaction): WalletTransactionRow {
  const amountCents = tx.amount;
  const direction: 'in' | 'out' = amountCents >= 0 ? 'in' : 'out';
  const flow = FLOW_MAP[tx.flow_type as string] ?? 'other';
  return {
    id: tx.id,
    flow,
    direction,
    amount: Math.abs(amountCents) / 100,
    status: tx.status as 'open' | 'posted' | 'void',
    description: tx.description || labelForFlow(flow, direction),
    counterparty: null,
    createdAt: new Date(tx.created * 1000).toISOString(),
  };
}

function labelForFlow(
  flow: WalletTransactionRow['flow'],
  direction: 'in' | 'out'
): string {
  switch (flow) {
    case 'inbound_transfer':
      return 'Bank transfer in';
    case 'outbound_transfer':
      return 'Bank transfer out';
    case 'outbound_payment':
      return 'Payment sent';
    case 'received_credit':
      return 'Credit received';
    case 'received_debit':
      return 'Debit';
    case 'issuing_authorization':
      return 'Card authorization';
    default:
      return direction === 'in' ? 'Funds received' : 'Funds sent';
  }
}
