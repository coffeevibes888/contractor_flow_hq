import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { normalizeTier } from '@/lib/config/subscription-tiers';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let isTeamMember = false;
    let isTenant = false;
    let landlordId = '';
    let subscriptionTier = 'starter';

    // Check if user owns a landlord account (is the owner)
    const ownedLandlord = await prisma.landlord.findFirst({
      where: {
        ownerUserId: userId,
      },
      include: {
        subscription: true,
      },
    });

    if (ownedLandlord) {
      isTeamMember = true; // Owner is always a team member
      landlordId = ownedLandlord.id;
      subscriptionTier = normalizeTier(ownedLandlord.subscription?.tier || ownedLandlord.subscriptionTier);
    }

    // Check if user is a team member
    if (!isTeamMember) {
      try {
        const teamMemberModel = (prisma as any).teamMember;
        const teamMember = await teamMemberModel?.findFirst?.({
          where: {
            userId,
            status: 'active',
          },
          include: {
            landlord: {
              select: {
                id: true,
                subscriptionTier: true,
              },
            },
          },
        });

        if (teamMember) {
          isTeamMember = true;
          landlordId = teamMember.landlordId;
          subscriptionTier = normalizeTier(teamMember.landlord?.subscriptionTier);
        }
      } catch (error) {
        // TeamMember model might not exist yet
        console.log('TeamMember check skipped:', error);
      }
    }

    // If not a team member, check if user is a tenant
    if (!isTeamMember) {
      try {
        // Check if user has an active lease
        const lease = await prisma.lease.findFirst({
          where: {
            tenantId: userId,
            status: {
              in: ['active', 'pending'],
            },
          },
          include: {
            unit: {
              include: {
                property: {
                  include: {
                    landlord: {
                      select: {
                        id: true,
                        subscriptionTier: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (lease && lease.unit?.property?.landlord) {
          isTenant = true;
          landlordId = lease.unit.property.landlord.id;
          subscriptionTier = normalizeTier(lease.unit.property.landlord.subscriptionTier);
        }
      } catch (error) {
        console.error('Tenant check error:', error);
      }
    }

    // Return access information
    return NextResponse.json({
      success: true,
      isTeamMember,
      isTenant,
      landlordId,
      subscriptionTier,
      hasChatAccess: isTeamMember || (isTenant && (subscriptionTier === 'pro' || subscriptionTier === 'enterprise')),
    });
  } catch (error) {
    console.error('Chat access check error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check chat access' },
      { status: 500 }
    );
  }
}
