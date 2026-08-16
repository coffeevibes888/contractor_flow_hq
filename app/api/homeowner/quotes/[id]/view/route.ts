import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * POST - Mark quote as viewed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const quoteId = params.id;

    // Get quote and verify ownership
    const quote = await prisma.contractorQuote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.customerId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this quote' },
        { status: 403 }
      );
    }

    // Only update if status is pending
    if (quote.status === 'pending') {
      await prisma.contractorQuote.update({
        where: { id: quoteId },
        data: {
          status: 'viewed',
          viewedAt: new Date(),
          viewCount: { increment: 1 },
        },
      });

      // Update lead match status if exists
      if (quote.leadMatchId) {
        await prisma.contractorLeadMatch.update({
          where: { id: quote.leadMatchId },
          data: {
            status: 'viewed',
            viewedAt: new Date(),
          },
        });
      }
    } else {
      // Just increment view count
      await prisma.contractorQuote.update({
        where: { id: quoteId },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking quote as viewed:', error);
    return NextResponse.json(
      { error: 'Failed to mark quote as viewed' },
      { status: 500 }
    );
  }
}
