import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/config/subscription-tiers';

/**
 * Manual tier setter for testing purposes
 * Only accessible by superAdmin
 * 
 * POST /api/super-admin/set-tier
 * Body: { landlordId: string, tier: 'free' | 'pro' | 'enterprise', durationDays?: number, isGrant?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { landlordId, tier, durationDays, isGrant } = await request.json();

    if (!landlordId || !tier) {
      return NextResponse.json({ error: 'landlordId and tier are required' }, { status: 400 });
    }

    if (!['free', 'pro', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be: free, pro, or enterprise' }, { status: 400 });
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as SubscriptionTier];
    
    // Calculate period end based on duration (default 30 days, or custom)
    const periodDays = durationDays || 30;
    const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    // Update or create the subscription
    await prisma.landlordSubscription.upsert({
      where: { landlordId },
      create: {
        landlordId,
        tier,
        status: 'active',
        unitLimit: tierConfig.unitLimit === Infinity ? 999999 : tierConfig.unitLimit,
        freeBackgroundChecks: tierConfig.features.freeBackgroundChecks,
        freeEvictionChecks: tierConfig.features.freeEvictionChecks,
        freeEmploymentVerification: tierConfig.features.freeEmploymentVerification,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        isGranted: isGrant || false,
        grantedBy: isGrant ? session.user.id : null,
        grantedAt: isGrant ? new Date() : null,
      },
      update: {
        tier,
        status: 'active',
        unitLimit: tierConfig.unitLimit === Infinity ? 999999 : tierConfig.unitLimit,
        freeBackgroundChecks: tierConfig.features.freeBackgroundChecks,
        freeEvictionChecks: tierConfig.features.freeEvictionChecks,
        freeEmploymentVerification: tierConfig.features.freeEmploymentVerification,
        currentPeriodEnd: periodEnd,
        isGranted: isGrant || false,
        grantedBy: isGrant ? session.user.id : null,
        grantedAt: isGrant ? new Date() : null,
      },
    });

    // Also update the landlord record
    await prisma.landlord.update({
      where: { id: landlordId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        freeBackgroundChecks: tierConfig.features.freeBackgroundChecks,
        freeEmploymentVerification: tierConfig.features.freeEmploymentVerification,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Landlord subscription set to ${tierConfig.name} tier`,
      tier,
      features: tierConfig.features,
      unitLimit: tierConfig.unitLimit,
      periodEnd: periodEnd.toISOString(),
      isGranted: isGrant || false,
    });
  } catch (error) {
    console.error('Failed to set tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - List all landlords with their current tiers (for the UI)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only fetch landlords that have valid owner accounts
    const landlords = await prisma.landlord.findMany({
      where: {
        owner: {
          isNot: null, // Only landlords with valid owner accounts
        },
      },
      include: {
        subscription: true,
        owner: { select: { email: true, name: true } },
        _count: { select: { properties: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get current user's landlord for the toggle feature
    const currentUserLandlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      include: { subscription: true },
    });

    return NextResponse.json({
      landlords: landlords.map(l => ({
        id: l.id,
        name: l.name,
        email: l.owner?.email || 'No email',
        currentTier: l.subscription?.tier || l.subscriptionTier || 'free',
        status: l.subscription?.status || l.subscriptionStatus || 'active',
        propertyCount: l._count.properties,
        periodEnd: l.subscription?.currentPeriodEnd,
        isGranted: (l.subscription as any)?.isGranted || false,
        isCurrentUser: l.ownerUserId === session.user.id,
      })),
      availableTiers: Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => ({
        id: key,
        name: config.name,
        price: config.price,
        unitLimit: config.unitLimit,
      })),
      currentUserLandlordId: currentUserLandlord?.id || null,
      currentUserTier: currentUserLandlord?.subscription?.tier || currentUserLandlord?.subscriptionTier || 'free',
    });
  } catch (error) {
    console.error('Failed to get landlords:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel/revoke a granted subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { landlordId } = await request.json();

    if (!landlordId) {
      return NextResponse.json({ error: 'landlordId is required' }, { status: 400 });
    }

    // Reset to starter tier
    const starterTier = SUBSCRIPTION_TIERS.starter;

    await prisma.landlordSubscription.upsert({
      where: { landlordId },
      create: {
        landlordId,
        tier: 'starter',
        status: 'active',
        unitLimit: starterTier.unitLimit,
        freeBackgroundChecks: starterTier.features.freeBackgroundChecks,
        freeEvictionChecks: starterTier.features.freeEvictionChecks,
        freeEmploymentVerification: starterTier.features.freeEmploymentVerification,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        isGranted: false,
        grantedBy: null,
        grantedAt: null,
      },
      update: {
        tier: 'starter',
        status: 'active',
        unitLimit: starterTier.unitLimit,
        freeBackgroundChecks: starterTier.features.freeBackgroundChecks,
        freeEvictionChecks: starterTier.features.freeEvictionChecks,
        freeEmploymentVerification: starterTier.features.freeEmploymentVerification,
        currentPeriodEnd: null,
        isGranted: false,
        grantedBy: null,
        grantedAt: null,
      },
    });

    await prisma.landlord.update({
      where: { id: landlordId },
      data: {
        subscriptionTier: 'starter',
        subscriptionStatus: 'active',
        freeBackgroundChecks: starterTier.features.freeBackgroundChecks,
        freeEmploymentVerification: starterTier.features.freeEmploymentVerification,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription revoked, reset to free tier',
    });
  } catch (error) {
    console.error('Failed to revoke subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
