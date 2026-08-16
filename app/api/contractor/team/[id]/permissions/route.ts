import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { resolveContractorAuth } from '@/lib/contractor-auth';

/**
 * PATCH /api/contractor/team/[id]/permissions
 *
 * Customize the effective permissions for a specific employee. This is a
 * PRIVILEGED operation — only the contractor owner may change another
 * employee's permission set. Letting an employee do this would let them
 * escalate their own access (or someone else's) which is exactly the kind
 * of liability the system has to prevent.
 */
export async function PATCH(
  req: NextRequest,
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

    // Hard guard — only the owner can change permissions.
    if (!contractorAuth.isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only the account owner can change team member permissions',
        },
        { status: 403 }
      );
    }

    const { id: memberId } = await params;
    const body = await req.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, message: 'Invalid permissions format' },
        { status: 400 }
      );
    }

    // Make sure the member belongs to this contractor (no cross-tenant edits).
    const member = await prisma.contractorEmployee.findUnique({
      where: { id: memberId },
      select: { id: true, contractorId: true, role: true },
    });

    if (!member || member.contractorId !== contractorAuth.contractorId) {
      return NextResponse.json(
        { success: false, message: 'Team member not found' },
        { status: 404 }
      );
    }

    // Don't let anyone tamper with the owner record's permissions.
    if (member.role === 'owner') {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot modify owner permissions — owner always has full access',
        },
        { status: 400 }
      );
    }

    // Filter to strings to keep junk out of the JSON column.
    const cleanPermissions = permissions.filter(
      (p): p is string => typeof p === 'string'
    );

    await prisma.contractorEmployee.update({
      where: { id: memberId },
      data: { customPermissions: cleanPermissions },
    });

    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully',
      permissions: cleanPermissions,
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}
