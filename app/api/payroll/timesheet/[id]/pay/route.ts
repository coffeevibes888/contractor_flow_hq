/**
 * POST /api/payroll/timesheet/[id]/pay
 *
 * Execute payroll for an approved timesheet. Treasury OutboundPayment
 * runs immediately on PM confirmation — no scheduled, automated, or
 * deferred execution. Same $1 fee model as marketplace.
 *
 * Body: {} (no body needed; the timesheet drives everything)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getPayrollAccess, PayrollAccessError } from '@/lib/services/payroll-access';
import { executeTimesheetPayment } from '@/lib/services/payroll.service';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    access.assertAtLeastBasic();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ts = await prisma.timesheet.findUnique({
      where: { id },
      select: { landlordId: true },
    });
    if (!ts || ts.landlordId !== access.landlordId) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const result = await executeTimesheetPayment({
      timesheetId: id,
      applyOvertime: access.level === 'full',
      callerUserId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, reason: result.reason },
        { status: 400 }
      );
    }
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    console.error('[payroll/timesheet/pay] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not run payroll.' },
      { status: 500 }
    );
  }
}
