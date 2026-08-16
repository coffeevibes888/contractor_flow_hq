/**
 * GET /api/payroll/access
 *
 * Returns the current user's payroll access level so the UI can render
 * the right state (locked card, basic UI, full UI). Cheap to call —
 * the wallet header polls this on mount.
 */
import { NextResponse } from 'next/server';
import { getPayrollAccess } from '@/lib/services/payroll-access';

export async function GET(): Promise<NextResponse> {
  const access = await getPayrollAccess();
  return NextResponse.json({
    level: access.level,
    tier: access.tier,
    isOwner: access.isOwner,
  });
}
