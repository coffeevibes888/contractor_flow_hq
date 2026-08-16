import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { CONTRACTOR_TIERS, ContractorTier } from '@/lib/config/contractor-subscription-tiers';

const VALID_TIERS: ContractorTier[] = ['starter', 'pro', 'enterprise'];

// POST - Grant a tier to a contractor
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorProfileId, tier, durationDays, isGrant } = await request.json();

    if (!contractorProfileId || !tier) {
      return NextResponse.json({ error: 'contractorProfileId and tier are required' }, { status: 400 });
    }

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be: starter, pro, or enterprise' }, { status: 400 });
    }

    const periodDays = durationDays || 30;
    const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    await prisma.contractorProfile.update({
      where: { id: contractorProfileId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Contractor subscription set to ${CONTRACTOR_TIERS[tier as ContractorTier].name} tier`,
      tier,
      periodEnd: periodEnd.toISOString(),
      isGranted: isGrant || false,
    });
  } catch (error) {
    console.error('Failed to set contractor tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - List all contractor profiles with their tiers
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractors = await prisma.contractorProfile.findMany({
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      contractors: contractors.map((c) => ({
        id: c.id,
        name: c.businessName || c.displayName,
        email: c.user?.email || c.email || 'No email',
        currentTier: c.subscriptionTier || 'starter',
        status: c.subscriptionStatus || 'trialing',
        periodEnd: c.currentPeriodEnd,
      })),
      availableTiers: VALID_TIERS.map((key) => ({
        id: key,
        name: CONTRACTOR_TIERS[key].name,
        price: CONTRACTOR_TIERS[key].price,
      })),
    });
  } catch (error) {
    console.error('Failed to get contractors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Revoke contractor subscription back to starter
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractorProfileId } = await request.json();

    if (!contractorProfileId) {
      return NextResponse.json({ error: 'contractorProfileId is required' }, { status: 400 });
    }

    await prisma.contractorProfile.update({
      where: { id: contractorProfileId },
      data: {
        subscriptionTier: 'starter',
        subscriptionStatus: 'trialing',
        currentPeriodEnd: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Contractor subscription revoked, reset to Starter tier',
    });
  } catch (error) {
    console.error('Failed to revoke contractor subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
