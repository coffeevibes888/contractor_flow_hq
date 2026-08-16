import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

/**
 * POST - Accept a quote
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
        { error: 'You do not have permission to accept this quote' },
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

    // Check if quote is in acceptable status
    if (!['pending', 'viewed'].includes(quote.status)) {
      return NextResponse.json(
        { error: `Cannot accept quote with status: ${quote.status}` },
        { status: 400 }
      );
    }

    // Update quote status
    const updatedQuote = await prisma.contractorQuote.update({
      where: { id: quoteId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Update lead match status if exists
    if (quote.leadMatchId) {
      await prisma.contractorLeadMatch.update({
        where: { id: quote.leadMatchId },
        data: {
          status: 'won',
          wasBooked: true,
          jobValue: quote.totalPrice,
        },
      });
    }

    // Update lead status
    await prisma.contractorLead.update({
      where: { id: quote.leadId },
      data: {
        status: 'booked',
      },
    });

    // Get contractor user ID for notification
    const contractorUserId = quote.contractor.userId;

    // Create a HomeownerWorkOrder from the accepted quote
    try {
      const workOrder = await prisma.homeownerWorkOrder.create({
        data: {
          homeownerId: session.user.id,
          contractorId: quote.contractorId,
          title: quote.title,
          description: quote.description || quote.projectScope || '',
          status: 'assigned',
          priority: quote.lead.urgency === 'emergency' ? 'urgent' : 
                   quote.lead.urgency === 'urgent' ? 'high' : 'medium',
          budgetMin: quote.totalPrice.toString(),
          budgetMax: quote.totalPrice.toString(),
          scheduledDate: quote.startDate || null,
          notes: quote.notes || '',
          images: [],
          category: quote.lead.projectType,
          address: {
            street: quote.lead.propertyAddress || '',
            city: quote.lead.propertyCity || '',
            state: quote.lead.propertyState || '',
            zipCode: quote.lead.propertyZip || '',
          },
        },
      });

      // Create an accepted bid record
      await prisma.homeownerWorkOrderBid.create({
        data: {
          workOrderId: workOrder.id,
          contractorId: quote.contractorId,
          amount: quote.totalPrice,
          message: `Quote accepted: ${quote.title}`,
          status: 'accepted',
        },
      });

      // Update quote with booking info
      await prisma.contractorQuote.update({
        where: { id: quoteId },
        data: {
          bookingCreatedAt: new Date(),
          bookingId: workOrder.id,
        },
      });
    } catch (error) {
      console.error('Error creating work order from quote:', error);
      // Continue even if work order creation fails
    }

    // Send notification to contractor
    try {
      await MarketplaceNotifications.notifyQuoteAccepted({
        contractorId: contractorUserId,
        quoteId: quote.id,
        leadTitle: quote.lead.projectTitle || quote.lead.projectType,
        customerName: session.user.name || 'A customer',
        amount: Number(quote.totalPrice),
      });
    } catch (error) {
      console.error('Failed to send quote acceptance notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
    });
  } catch (error) {
    console.error('Error accepting quote:', error);
    return NextResponse.json(
      { error: 'Failed to accept quote' },
      { status: 500 }
    );
  }
}
