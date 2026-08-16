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

    if (new Date(counterOffer.validUntil) < new Date()) {
      return NextResponse.json(
        { error: 'Counter offer has expired' },
        { status: 400 }
      );
    }

    // Accept counter offer and update original quote
    await prisma.$transaction(async (tx) => {
      // Update counter offer status
      await tx.contractorQuoteCounter.update({
        where: { id: counterOfferId },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      // Update original quote with counter offer terms
      await tx.contractorQuote.update({
        where: { id: counterOffer.originalQuoteId },
        data: {
          basePrice: counterOffer.basePrice,
          tax: counterOffer.tax,
          totalPrice: counterOffer.totalPrice,
          completionDate: counterOffer.deliveryDate || counterOffer.originalQuote.completionDate,
          notes: counterOffer.notes
            ? `${counterOffer.originalQuote.notes || ''}\n\nUpdated terms (counter offer accepted): ${counterOffer.notes}`.trim()
            : counterOffer.originalQuote.notes,
          status: 'pending', // Reset to pending for customer to accept updated quote
          counterOfferCount: counterOffer.originalQuote.counterOfferCount + 1,
          lastCounterOfferAt: new Date(),
        },
      });
    });

    // Send notification to customer
    try {
      await MarketplaceNotifications.notifyCounterOfferAccepted({
        customerId: counterOffer.originalQuote.customerId,
        quoteId: counterOffer.originalQuoteId,
        leadTitle: counterOffer.originalQuote.title,
        contractorName: counterOffer.originalQuote.contractor.displayName || counterOffer.originalQuote.contractor.businessName,
        amount: counterOffer.totalPrice.toNumber(),
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Counter offer accepted. Quote has been updated.',
    });
  } catch (error) {
    console.error('Error accepting counter offer:', error);
    return NextResponse.json(
      { error: 'Failed to accept counter offer' },
      { status: 500 }
    );
  }
}
