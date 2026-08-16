/**
 * POST /api/payroll/team-member/[id]/rate
 *
 * Body: { hourlyRate: number }
 *
 * Auth: landlord owner; plan: Pro or Enterprise.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { getPayrollAccess, PayrollAccessError } from '@/lib/services/payroll-access';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const access = await getPayrollAccess();
    access.assertAtLeastBasic();

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      hourlyRate?: number;
    };
    const rate = Number(body.hourlyRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 10000) {
      return NextResponse.json(
        { error: 'Hourly rate must be between $0 and $10,000.' },
        { status: 400 }
      );
    }

    const tm = await prisma.teamMember.findUnique({
      where: { id },
      select: { landlordId: true },
    });
    if (!tm || tm.landlordId !== access.landlordId) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    await prisma.teamMember.update({
      where: { id },
      data: { hourlyRate: rate },
    });
    return NextResponse.json({ success: true, hourlyRate: rate });
  } catch (err: any) {
    if (err instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: err.userMessage, code: err.code },
        { status: err.code === 'owner_only' ? 403 : 402 }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Could not update rate.' },
      { status: 500 }
    );
  }
}
