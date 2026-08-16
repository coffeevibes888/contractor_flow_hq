import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

/**
 * POST - Send counter-offer on a quote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: quoteId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { basePrice, totalPrice, completionDate, notes } = body;

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
        { error: 'You do not have permission to counter this quote' },
        { status: 403 }
      );
    }

    // Check if quote is still valid
    if (new Date(quote.validUntil) < new Date()) {
      return NextResponse.json(
        { error: 'This quote has expired' },
        { status: 400 }
      );
    }

    // Check if quote is in counterable status
    if (!['pending', 'viewed'].includes(quote.status)) {
      return NextResponse.json(
        { error: `Cannot counter quote with status: ${quote.status}` },
        { status: 400 }
      );
    }

    // Validate counter-offer price
    const counterPrice = Number(basePrice);
    const originalPrice = Number(quote.totalPrice);

    if (counterPrice >= originalPrice) {
      return NextResponse.json(
        { error: 'Counter-offer must be lower than original quote' },
        { status: 400 }
      );
    }

    if (counterPrice < originalPrice * 0.5) {
      return NextResponse.json(
        { error: 'Counter-offer must be at least 50% of original quote' },
        { status: 400 }
      );
    }

    // Calculate new valid until (7 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    // Create counter-offer
    const counterOffer = await prisma.contractorQuoteCounter.create({
      data: {
        originalQuoteId: quoteId,
        counterType: 'customer_counter',
        counterBy: session.user.id,
        basePrice: Number(basePrice),
        totalPrice: Number(totalPrice),
        deliveryDate: completionDate ? new Date(completionDate) : null,
        notes,
        validUntil,
      },
    });

    // Update quote status and counter count
    await prisma.contractorQuote.update({
      where: { id: quoteId },
      data: {
        status: 'counterOffered',
        counterOfferCount: { increment: 1 },
        lastCounterOfferAt: new Date(),
      },
    });

    // Get contractor user ID for notification
    const contractorUserId = quote.contractor.userId;

    // Send notification to contractor
    try {
      await MarketplaceNotifications.notifyCounterOfferReceived({
        contractorId: contractorUserId,
        quoteId: quote.id,
        leadTitle: quote.lead.projectTitle || quote.lead.projectType,
        customerName: session.user.name || 'A customer',
        originalAmount: Number(quote.totalPrice),
        counterAmount: Number(totalPrice),
      });
    } catch (error) {
      console.error('Failed to send counter-offer notification:', error);
    }

    return NextResponse.json({
      success: true,
      counterOffer,
    });
  } catch (error) {
    console.error('Error creating counter-offer:', error);
    return NextResponse.json(
      { error: 'Failed to create counter-offer' },
      { status: 500 }
    );
  }
}
