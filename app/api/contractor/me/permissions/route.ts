import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { resolveContractorAuth } from '@/lib/contractor-auth';

/**
 * GET /api/contractor/me/permissions
 *
 * Returns the resolved permissions for the current user against their
 * contractor account. Used by the nav and other client components to show
 * or hide entries the user cannot access.
 *
 * IMPORTANT: This endpoint is for UX gating only. Every page and API still
 * enforces its own server-side permission check. Hiding a nav link should
 * never be the only thing standing between an employee and a sensitive
 * route.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      isOwner: contractorAuth.isOwner,
      tier: contractorAuth.tier,
      roleName: contractorAuth.roleName,
      permissions: contractorAuth.permissions,
    });
  } catch (error) {
    console.error('GET /api/contractor/me/permissions', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
