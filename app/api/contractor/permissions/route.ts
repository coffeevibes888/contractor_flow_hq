import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveContractorAuth } from '@/lib/contractor-auth';

/**
 * GET /api/contractor/permissions
 *
 * Returns the current user's effective permissions, role info, and whether
 * they are the owner. Used by the frontend to conditionally show/hide UI.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'No contractor context found' }, { status: 404 });
    }

    return NextResponse.json({
      contractorId: contractorAuth.contractorId,
      isOwner: contractorAuth.isOwner,
      permissions: contractorAuth.permissions,
      tier: contractorAuth.tier,
      employeeId: contractorAuth.employeeId || null,
      roleName: contractorAuth.roleName || (contractorAuth.isOwner ? 'Owner' : null),
    });
  } catch (error) {
    console.error('GET /api/contractor/permissions', error);
    return NextResponse.json({ error: 'Failed to resolve permissions' }, { status: 500 });
  }
}
