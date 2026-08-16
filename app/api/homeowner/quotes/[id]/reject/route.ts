import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

/**
 * POST - Reject a quote
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
    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get quote and verify ownership
    const quote = await prisma.contractorQuote.findUnique({
      where: { id: quoteId },
      include: {
        contractor: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        lead: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.customerId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to reject this quote' },
        { status: 403 }
      );
    }

    // Check if quote is in rejectable status
    if (!['pending', 'viewed'].includes(quote.status)) {
      return NextResponse.json(
        { error: `Cannot reject quote with status: ${quote.status}` },
        { status: 400 }
      );
    }

    // Update quote status
    const updatedQuote = await prisma.contractorQuote.update({
      where: { id: quoteId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Update lead match status if exists
    if (quote.leadMatchId) {
      await prisma.contractorLeadMatch.update({
        where: { id: quote.leadMatchId },
        data: {
          status: 'lost',
        },
      });
    }

    // Get contractor user ID for notification
    const contractorUserId = quote.contractor.userId;

    // Send notification to contractor with rejection reason
    try {
      await MarketplaceNotifications.notifyQuoteRejected({
        contractorId: contractorUserId,
        quoteId: quote.id,
        leadTitle: quote.lead.projectTitle || quote.lead.projectType,
        customerName: session.user.name || 'The customer',
        reason,
      });
    } catch (error) {
      console.error('Failed to send quote rejection notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
    });
  } catch (error) {
    console.error('Error rejecting quote:', error);
    return NextResponse.json(
      { error: 'Failed to reject quote' },
      { status: 500 }
    );
  }
}
