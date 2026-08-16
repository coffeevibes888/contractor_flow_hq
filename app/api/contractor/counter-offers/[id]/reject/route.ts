import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: counterOfferId } = await params;

    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Get counter offer with original quote
    const counterOffer = await prisma.contractorQuoteCounter.findUnique({
      where: { id: counterOfferId },
      include: {
        originalQuote: {
          include: {
            contractor: true,
            customer: true,
          },
        },
      },
    });

    if (!counterOffer) {
      return NextResponse.json(
        { error: 'Counter offer not found' },
        { status: 404 }
      );
    }

    // Verify this counter offer is for this contractor's quote
    if (counterOffer.originalQuote.contractorId !== contractorProfile.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if counter offer is still valid
    if (counterOffer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Counter offer is no longer pending' },
        { status: 400 }
      );
    }

    // Reject counter offer
    await prisma.contractorQuoteCounter.update({
      where: { id: counterOfferId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
      },
    });

    // Update original quote status back to pending
    await prisma.contractorQuote.update({
      where: { id: counterOffer.originalQuoteId },
      data: {
        status: 'pending',
      },
    });

    // Send notification to customer
    try {
      await MarketplaceNotifications.notifyCounterOfferRejected({
        customerId: counterOffer.originalQuote.customerId,
        quoteId: counterOffer.originalQuoteId,
        leadTitle: counterOffer.originalQuote.title,
        contractorName: counterOffer.originalQuote.contractor.displayName || counterOffer.originalQuote.contractor.businessName,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Counter offer rejected',
    });
  } catch (error) {
    console.error('Error rejecting counter offer:', error);
    return NextResponse.json(
      { error: 'Failed to reject counter offer' },
      { status: 500 }
    );
  }
}
