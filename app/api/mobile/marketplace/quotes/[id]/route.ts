/**
 * POST /api/mobile/marketplace/quotes/[id]
 *
 * Customer action on a digital quote:
 *   - action: 'accept' | 'decline' | 'counter'
 *   - counterAmount?, counterNote?  (counter)
 *
 * Mirrors the website's customer/quotes/[id] flow but with mobile JWT auth.
 *
 * On accept, the next step is paying / funding escrow which the mobile app
 * triggers via Stripe payment sheet using the existing payment-intent API.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { emitMarketplaceCard } from '@/lib/services/marketplace-cards';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const auth = await verifyMobileToken(token);
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: quoteId } = await params;
    const body = await req.json();
    const { action, counterAmount, counterNote } = body ?? {};

    if (!['accept', 'decline', 'counter'].includes(action)) {
      return NextResponse.json({ error: 'action must be accept, decline, or counter' }, { status: 400 });
    }

    const quote = await prisma.contractorQuote.findUnique({
      where: { id: quoteId },
      select: {
        id: true,
        customerId: true,
        contractorId: true,
        status: true,
        title: true,
        totalPrice: true,
        validUntil: true,
      },
    });
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    if (quote.customerId !== auth.userId) {
      return NextResponse.json({ error: 'Not your quote' }, { status: 403 });
    }
    if (['accepted', 'rejected', 'expired'].includes(quote.status)) {
      return NextResponse.json({ error: `Quote is already ${quote.status}` }, { status: 400 });
    }
    if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
      return NextResponse.json({ error: 'Quote has expired' }, { status: 400 });
    }

    // Resolve contractor's userId for card-emission
    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { id: quote.contractorId },
      select: { userId: true },
    });
    const contractorUserId = contractorProfile?.userId;

    if (action === 'decline') {
      const u = await prisma.contractorQuote.update({
        where: { id: quoteId },
        data: { status: 'rejected', rejectedAt: new Date(), rejectionReason: counterNote ?? null },
      });
      await emitMarketplaceCard(auth.userId, contractorUserId, {
        kind: 'quote_declined',
        title: 'Quote declined',
        summary: counterNote ? `Customer declined: "${counterNote}"` : 'Customer declined the quote',
        refId: quoteId,
        refType: 'quote',
        amount: Number(quote.totalPrice),
      });
      return NextResponse.json({ success: true, status: u.status });
    }

    if (action === 'accept') {
      const u = await prisma.contractorQuote.update({
        where: { id: quoteId },
        data: { status: 'accepted', acceptedAt: new Date() },
        select: { id: true, status: true, totalPrice: true },
      });
      await emitMarketplaceCard(auth.userId, contractorUserId, {
        kind: 'quote_accepted',
        title: 'Quote accepted',
        summary: `Customer accepted ${quote.title} for $${Number(u.totalPrice).toFixed(0)}`,
        amount: Number(u.totalPrice),
        refId: quoteId,
        refType: 'quote',
        details: { nextStep: 'fund_escrow' },
      });
      return NextResponse.json({
        success: true,
        status: u.status,
        amount: Number(u.totalPrice),
        nextStep: 'fund_escrow',
      });
    }

    if (action === 'counter') {
      if (counterAmount == null || isNaN(Number(counterAmount))) {
        return NextResponse.json({ error: 'counterAmount required' }, { status: 400 });
      }
      const counter = await prisma.contractorQuoteCounter.create({
        data: {
          originalQuoteId: quoteId,
          counterType: 'customer_counter',
          counterBy: auth.userId,
          basePrice: Number(counterAmount),
          totalPrice: Number(counterAmount),
          notes: counterNote ?? null,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
        },
      });
      await prisma.contractorQuote.update({
        where: { id: quoteId },
        data: {
          status: 'counterOffered',
          counterOfferCount: { increment: 1 },
          lastCounterOfferAt: new Date(),
        },
      });
      await emitMarketplaceCard(auth.userId, contractorUserId, {
        kind: 'quote_countered',
        title: 'Counter offer',
        summary: `Customer countered: $${Number(counterAmount).toFixed(0)}`,
        amount: Number(counterAmount),
        refId: quoteId,
        refType: 'quote',
        details: counterNote ? { note: counterNote } : undefined,
      });
      return NextResponse.json({ success: true, status: 'counterOffered', counterId: counter.id });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (error: any) {
    console.error('[mobile/marketplace/quotes/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Could not act on quote' }, { status: 500 });
  }
}
