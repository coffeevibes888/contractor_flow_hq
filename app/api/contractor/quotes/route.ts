import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { MarketplaceNotifications } from '@/lib/services/marketplace-notifications';

/**
 * POST - Create a new quote
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get contractor profile
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      leadId,
      title,
      description,
      projectScope,
      deliverables,
      basePrice,
      discount,
      tax,
      totalPrice,
      estimatedHours,
      hourlyRate,
      startDate,
      completionDate,
      paymentTerms,
      warranty,
      notes,
    } = body;

    // Validate required fields
    if (!leadId || !title || !basePrice) {
      return NextResponse.json(
        { error: 'Lead ID, title, and base price are required' },
        { status: 400 }
      );
    }

    // Get lead and verify it exists
    const lead = await prisma.contractorLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get customer ID
    const customerId = lead.customerUserId;
    if (!customerId) {
      return NextResponse.json(
        { error: 'Lead does not have an associated customer' },
        { status: 400 }
      );
    }

    // Calculate valid until date (7 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    // Create quote
    const quote = await prisma.contractorQuote.create({
      data: {
        leadId,
        contractorId: contractor.id,
        customerId,
        title,
        description,
        projectScope,
        deliverables: deliverables || [],
        basePrice: Number(basePrice),
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        totalPrice: Number(totalPrice),
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        startDate: startDate ? new Date(startDate) : null,
        completionDate: completionDate ? new Date(completionDate) : null,
        paymentTerms,
        warranty,
        notes,
        validUntil,
      },
    });

    // Update lead match status if exists
    const leadMatch = await prisma.contractorLeadMatch.findFirst({
      where: {
        leadId,
        contractorId: contractor.id,
      },
    });

    if (leadMatch) {
      await prisma.contractorLeadMatch.update({
        where: { id: leadMatch.id },
        data: {
          status: 'quoted',
          quotedAt: new Date(),
          quoteAmount: Number(totalPrice),
        },
      });
    }

    // Send notification to customer
    try {
      await MarketplaceNotifications.notifyQuoteReceived({
        customerId,
        quoteId: quote.id,
        leadTitle: lead.projectTitle || lead.projectType,
        contractorName: contractor.businessName || contractor.user?.name || 'A contractor',
        amount: Number(totalPrice),
      });
    } catch (error) {
      console.error('Failed to send quote notification:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get contractor's quotes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get contractor profile
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const quotes = await prisma.contractorQuote.findMany({
      where: {
        contractorId: contractor.id,
        ...(status && { status }),
      },
      include: {
        lead: {
          select: {
            id: true,
            projectTitle: true,
            projectType: true,
            customerName: true,
            customerEmail: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            counterOffers: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
