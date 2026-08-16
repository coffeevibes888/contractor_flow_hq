import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { eventBus } from '@/lib/event-system';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = await params;
    const body = await request.json();
    const { stage } = body;

    if (!stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 });
    }

    // Validate stage
    const validStages = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'nurture'];
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    // Get contractor profile
    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Get the match to find the lead ID
    const match = await prisma.contractorLeadMatch.findUnique({
      where: { id: matchId },
      select: { leadId: true, contractorId: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Lead match not found' }, { status: 404 });
    }

    // Verify ownership
    if (match.contractorId !== contractorProfile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update lead stage
    const updatedLead = await prisma.contractorLead.update({
      where: { id: match.leadId },
      data: {
        stage,
        lastContactDate: stage === 'contacted' ? new Date() : undefined,
      },
    });

    // Update lead match status
    await prisma.contractorLeadMatch.update({
      where: { id: matchId },
      data: {
        status: stage === 'won' ? 'won' : stage === 'lost' ? 'lost' : 'responded',
      },
    });

    await eventBus.emit('contractor.lead.stage_changed', {
      matchId,
      leadId: match.leadId,
      contractorId: match.contractorId,
      stage,
      changedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      message: 'Lead stage updated successfully',
    });
  } catch (error) {
    console.error('Error updating lead stage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
