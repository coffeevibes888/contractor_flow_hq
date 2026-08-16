import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';
import { canAccessFeature } from '@/lib/services/contractor-feature-gate';

// GET - List all campaigns
// Feature Gate: Requires 'marketing' feature (Pro or Enterprise tier)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Check marketing feature access
    const featureAccess = await canAccessFeature(contractorProfile.id, 'marketing');
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { 
          error: 'Feature locked',
          message: featureAccess.reason || 'Marketing features require Pro plan or higher',
          requiredTier: 'pro',
          currentTier: featureAccess.tier,
          feature: 'marketing'
        },
        { status: 403 }
      );
    }

    const campaigns = await prisma.contractorMarketingCampaign.findMany({
      where: { contractorId: contractorProfile.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST - Create new campaign
// Feature Gate: Requires 'marketing' feature (Pro or Enterprise tier)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Check marketing feature access
    const featureAccess = await canAccessFeature(contractorProfile.id, 'marketing');
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { 
          error: 'Feature locked',
          message: featureAccess.reason || 'Marketing features require Pro plan or higher',
          requiredTier: 'pro',
          currentTier: featureAccess.tier,
          feature: 'marketing'
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Determine status based on scheduling
    let status = 'draft';
    if (body.scheduledFor) {
      status = new Date(body.scheduledFor) > new Date() ? 'scheduled' : 'sending';
    } else {
      status = 'sending'; // Will be sent immediately
    }

    // Create campaign
    const campaign = await prisma.contractorMarketingCampaign.create({
      data: {
        contractorId: contractorProfile.id,
        name: body.name,
        type: body.type,
        subject: body.subject,
        message: body.message,
        targetAudience: body.targetAudience || 'all',
        status,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
      },
    });

    // Emit event for campaign creation
    await eventBus.emit('contractor.campaign.created', {
      campaignId: campaign.id,
      contractorId: contractorProfile.id,
      type: campaign.type,
      status: campaign.status,
      scheduledFor: campaign.scheduledFor,
    });

    // If sending immediately, trigger send process
    if (status === 'sending') {
      await eventBus.emit('contractor.campaign.send', {
        campaignId: campaign.id,
        contractorId: contractorProfile.id,
      });
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
