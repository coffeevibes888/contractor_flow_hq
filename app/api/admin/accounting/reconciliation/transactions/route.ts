import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';
import { toRow, type BankTransactionRow } from '@/lib/banking/stripe-bank-sync';
import type { BankTransactionSource, BankTransactionStatus, Prisma } from '@prisma/client';

const STATUS_VALUES: BankTransactionStatus[] = ['unmatched', 'matched', 'ignored', 'needs_review'];
const SOURCE_VALUES: BankTransactionSource[] = [
  'stripe_charge',
  'stripe_payout',
  'stripe_transfer',
  'stripe_outbound_xfer',
  'stripe_inbound_xfer',
  'stripe_application_fee',
  'csv',
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }
    await assertAccountingLedger(landlordId);

    const status = searchParams.get('status') as BankTransactionStatus | null;
    const source = searchParams.get('source') as BankTransactionSource | null;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const search = searchParams.get('q')?.trim() || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const where: Prisma.BankTransactionWhereInput = { landlordId };
    if (status && STATUS_VALUES.includes(status)) where.status = status;
    if (source && SOURCE_VALUES.includes(source)) where.source = source;
    if (fromDate || toDate) {
      where.postedAt = {};
      if (fromDate) where.postedAt.gte = new Date(fromDate);
      if (toDate) where.postedAt.lte = new Date(toDate);
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: { postedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          matchedJournalEntry: {
            select: { id: true, memo: true, effectiveDate: true, source: true, sourceId: true },
          },
        },
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    const data: BankTransactionRow[] = rows.map((r) => toRow(r));

    return NextResponse.json({
      success: true,
      data: {
        transactions: data,
        total,
        limit,
        offset,
        matchedJournalEntries: rows.reduce<Record<string, unknown>>((acc, r) => {
          if (r.matchedJournalEntry) {
            acc[r.id] = r.matchedJournalEntry;
          }
          return acc;
        }, {}),
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
