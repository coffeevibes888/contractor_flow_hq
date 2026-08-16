import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { eventBus } from '@/lib/event-system';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    const { matchId } = await params;

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

    // Get lead match
    const leadMatch = await prisma.contractorLeadMatch.findFirst({
      where: {
        id: matchId,
        contractorId: contractor.id,
      },
      include: {
        lead: true,
      },
    });

    if (!leadMatch) {
      return NextResponse.json({ error: 'Lead match not found' }, { status: 404 });
    }

    if (leadMatch.status !== 'pending') {
      return NextResponse.json(
        { error: 'Lead has already been processed' },
        { status: 400 }
      );
    }

    // Update lead match status
    await prisma.contractorLeadMatch.update({
      where: { id: matchId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        viewedAt: new Date(), // Mark as viewed since contractor is accepting
      },
    });

    // Deduct lead credit if applicable
    if (leadMatch.pricingModel === 'per_lead' && leadMatch.leadCost) {
      const leadCredit = await prisma.contractorLeadCredit.findUnique({
        where: { contractorId: contractor.id },
      });

      if (leadCredit && Number(leadCredit.creditBalance) >= Number(leadMatch.leadCost)) {
        await prisma.contractorLeadCredit.update({
          where: { contractorId: contractor.id },
          data: {
            creditBalance: { decrement: Number(leadMatch.leadCost) },
          },
        });

        // Create credit transaction
        await prisma.contractorCreditTransaction.create({
          data: {
            creditAccountId: leadCredit.id,
            type: 'lead_charge',
            amount: -Number(leadMatch.leadCost),
            balanceAfter: Number(leadCredit.creditBalance) - Number(leadMatch.leadCost),
            description: `Lead accepted: ${leadMatch.lead.projectTitle || leadMatch.lead.projectType}`,
            leadMatchId: matchId,
          },
        });
      }
    }

    await eventBus.emit('contractor.lead.accepted', {
      matchId,
      leadId: leadMatch.leadId,
      contractorId: contractor.id,
      contractorUserId: contractor.userId,
      pricingModel: leadMatch.pricingModel,
      leadCost: leadMatch.leadCost ? Number(leadMatch.leadCost) : null,
      acceptedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Lead accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting lead:', error);
    return NextResponse.json(
      { error: 'Failed to accept lead' },
      { status: 500 }
    );
  }
}