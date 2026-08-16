import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor profile
    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      leadId,
      amount,
      description,
      timeline,
      validUntil,
      includesLabor,
      includesMaterials,
      notes,
    } = body;

    // Validate required fields
    if (!leadId || !amount) {
      return NextResponse.json(
        { error: 'Lead ID and amount are required' },
        { status: 400 }
      );
    }

    // Check if lead exists
    const lead = await prisma.contractorLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Ensure we have a customer user ID
    if (!lead.customerUserId) {
      return NextResponse.json(
        { error: 'Lead does not have an associated customer user' },
        { status: 400 }
      );
    }

    // Calculate dates
    const now = new Date();
    const validUntilDate = validUntil ? new Date(validUntil) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Create quote
    const quote = await prisma.contractorQuote.create({
      data: {
        contractorId: contractorProfile.id,
        leadId,
        customerId: lead.customerUserId,
        title: lead.projectTitle || lead.projectType,
        description: description || lead.projectDescription,
        projectScope: notes || null,
        basePrice: parseFloat(amount),
        totalPrice: parseFloat(amount),
        validUntil: validUntilDate,
        status: 'pending',
      },
      include: {
        lead: {
          select: {
            customerName: true,
            customerEmail: true,
            projectType: true,
          },
        },
      },
    });

    // Update lead stage
    await prisma.contractorLead.update({
      where: { id: leadId },
      data: {
        stage: 'quoted',
        status: 'responded',
      },
    });

    // Update lead match status
    await prisma.contractorLeadMatch.updateMany({
      where: {
        leadId,
        contractorId: contractorProfile.id,
      },
      data: {
        status: 'quoted',
        quotedAt: new Date(),
        quoteAmount: parseFloat(amount),
      },
    });

    return NextResponse.json({
      success: true,
      quote,
      message: 'Quote created successfully',
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
