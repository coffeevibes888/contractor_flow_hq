import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    const bankTransactionId = searchParams.get('bankTransactionId');
    if (!landlordId || !bankTransactionId) {
      return NextResponse.json({ success: false, message: 'landlordId and bankTransactionId are required' }, { status: 400 });
    }
    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }
    await assertAccountingLedger(landlordId);

    const bt = await prisma.bankTransaction.findFirst({
      where: { id: bankTransactionId, landlordId },
    });
    if (!bt) return NextResponse.json({ success: false, message: 'Bank transaction not found' }, { status: 404 });

    const amount = Number(bt.amount);
    const lower = new Date(bt.postedAt.getTime() - 14 * 24 * 60 * 60 * 1000);
    const upper = new Date(bt.postedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

    const candidates = await prisma.journalEntry.findMany({
      where: {
        landlordId,
        effectiveDate: { gte: lower, lte: upper },
        bankTransaction: null,
        lines: {
          some: {
            OR: [{ debit: amount }, { credit: amount }],
          },
        },
      },
      select: {
        id: true,
        effectiveDate: true,
        memo: true,
        source: true,
        sourceId: true,
        lines: {
          select: {
            id: true,
            account: { select: { code: true, name: true } },
            debit: true,
            credit: true,
          },
          take: 4,
        },
      },
      orderBy: { effectiveDate: 'desc' },
      take: 25,
    });

    const sameDayMs = 24 * 60 * 60 * 1000;
    const enriched = candidates.map((je) => {
      const dayDelta = Math.abs(je.effectiveDate.getTime() - bt.postedAt.getTime()) / sameDayMs;
      const dayScore = Math.max(0, 1 - dayDelta / 14);
      const score = 0.6 + 0.4 * dayScore;
      return { ...je, score };
    });
    enriched.sort((a, b) => b.score - a.score);

    return NextResponse.json({ success: true, data: { candidates: enriched } });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
