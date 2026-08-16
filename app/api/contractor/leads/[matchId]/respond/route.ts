import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

/**
 * Respond to a lead
 * POST /api/contractor/leads/[matchId]/respond
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = await params;
    const { message, quoteAmount, estimatedDuration } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get the match and verify ownership
    const match = await prisma.contractorLeadMatch.findUnique({
      where: { id: matchId },
      include: {
        contractor: true,
        lead: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (match.contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already responded
    if (match.respondedAt) {
      return NextResponse.json({ error: 'Already responded to this lead' }, { status: 400 });
    }

    // Update the match
    await prisma.contractorLeadMatch.update({
      where: { id: matchId },
      data: {
        status: quoteAmount ? 'quoted' : 'responded',
        responseMessage: message.trim(),
        quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
        estimatedDuration: estimatedDuration || null,
        respondedAt: new Date(),
        quotedAt: quoteAmount ? new Date() : null,
      },
    });

    // Charge for the lead if pay-per-lead model
    if (match.pricingModel === 'per_lead' && match.leadCost) {
      const creditAccount = await prisma.contractorLeadCredit.findUnique({
        where: { contractorId: match.contractorId },
      });

      if (creditAccount) {
        const newBalance = parseFloat(creditAccount.creditBalance.toString()) - parseFloat(match.leadCost.toString());
        
        await prisma.contractorLeadCredit.update({
          where: { id: creditAccount.id },
          data: { creditBalance: newBalance },
        });

        await prisma.contractorCreditTransaction.create({
          data: {
            creditAccountId: creditAccount.id,
            type: 'lead_charge',
            amount: -parseFloat(match.leadCost.toString()),
            balanceAfter: newBalance,
            description: `Lead response: ${match.lead.projectType}`,
            leadMatchId: matchId,
          },
        });
      }
    }

    // Update lead status
    await prisma.contractorLead.update({
      where: { id: match.leadId },
      data: { status: 'responded' },
    });

    await eventBus.emit('contractor.lead.responded', {
      matchId,
      leadId: match.leadId,
      contractorId: match.contractorId,
      contractorUserId: match.contractor.userId,
      hasQuote: !!quoteAmount,
      quoteAmount: quoteAmount ? parseFloat(quoteAmount) : null,
      respondedAt: new Date().toISOString(),
    });

    // Customer-facing email + message-thread delivery is handled by the
    // 'contractor.lead.responded' event emitted above (see event-system
    // handlers). Keeping delivery in the event pipeline avoids blocking the
    // response request on outbound email.

    return NextResponse.json({
      success: true,
      message: 'Response sent successfully',
    });
  } catch (error) {
    console.error('Error responding to lead:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send response' },
      { status: 500 }
    );
  }
}
