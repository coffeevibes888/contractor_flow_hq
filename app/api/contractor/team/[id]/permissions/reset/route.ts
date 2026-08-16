import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { resolveContractorAuth } from '@/lib/contractor-auth';

/**
 * POST /api/contractor/team/[id]/permissions/reset
 *
 * Clears any custom permission overrides on a member, returning them to the
 * default permissions defined by their assigned role. Owner-only.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json(
        { success: false, message: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    if (!contractorAuth.isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only the account owner can reset team member permissions',
        },
        { status: 403 }
      );
    }

    const { id: memberId } = await params;

    const member = await prisma.contractorEmployee.findUnique({
      where: { id: memberId },
      include: {
        assignedRole: { select: { permissions: true } },
      },
    });

    if (!member || member.contractorId !== contractorAuth.contractorId) {
      return NextResponse.json(
        { success: false, message: 'Team member not found' },
        { status: 404 }
      );
    }

    if (member.role === 'owner') {
      return NextResponse.json(
        { success: false, message: 'Cannot reset owner permissions' },
        { status: 400 }
      );
    }

    // Clearing customPermissions makes the resolver fall back to role defaults.
    await prisma.contractorEmployee.update({
      where: { id: memberId },
      data: { customPermissions: [] },
    });

    const defaults = Array.isArray(member.assignedRole?.permissions)
      ? (member.assignedRole!.permissions as string[])
      : [];

    return NextResponse.json({
      success: true,
      message: 'Permissions reset to role defaults',
      permissions: defaults,
    });
  } catch (error) {
    console.error('Reset permissions error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset permissions' },
      { status: 500 }
    );
  }
}
