/**
 * GET /api/payroll/check-due
 *
 * Lightweight on-page-load check that replaces the cron we cannot run on
 * Vercel Hobby. Returns the team members whose pay schedule date is
 * today or earlier AND who have at least one approved unpaid timesheet.
 *
 * Enterprise only — Pro doesn't get scheduling.
 *
 * Cache hint header set to 1 hour (matches the SWR `dedupingInterval`
 * the UI uses) so we don't hammer the DB on every render.
 */
import { NextResponse } from 'next/server';
import {
  getPayrollAccess,
  PayrollAccessError,
} from '@/lib/services/payroll-access';
import { getDuePayrollItems } from '@/lib/services/payroll.service';

export async function GET(): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    if (access.level !== 'full') {
      return NextResponse.json(
        { due: [], message: 'Pay scheduling is Enterprise only.' },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=3600',
          },
        }
      );
    }
    access.assertFull();

    const due = await getDuePayrollItems(access.landlordId!);
    return NextResponse.json(
      { due },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=3600',
        },
      }
    );
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code, due: [] },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Could not check.', due: [] },
      { status: 500 }
    );
  }
}
