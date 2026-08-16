import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can, meetsMinTier } from '@/lib/contractor-auth';

// ── PATCH — mark a paycheck as paid, void, or update payment details ──────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; paycheckId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    if (!meetsMinTier(contractorAuth, 'pro')) return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    if (!can(contractorAuth, 'payroll.mark_paid')) return NextResponse.json({ error: 'Insufficient permissions — payroll.mark_paid required' }, { status: 403 });

    const contractorProfile = { id: contractorAuth.contractorId };
    const db = prisma as any;

    // Verify payroll belongs to contractor
    const payroll = await db.contractorPayroll.findUnique({
      where: { id: params.id, contractorId: contractorProfile.id },
    });
    if (!payroll) return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });

    const paycheck = await db.contractorPaycheck.findUnique({
      where: { id: params.paycheckId, payrollId: params.id },
    });
    if (!paycheck) return NextResponse.json({ error: 'Paycheck not found' }, { status: 404 });

    const body = await req.json();
    const { status, paymentMethod, paymentRef, notes } = body as {
      status?: string;
      paymentMethod?: string;
      paymentRef?: string;
      notes?: string;
    };

    const allowed = ['pending', 'paid', 'void'];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await db.contractorPaycheck.update({
      where: { id: params.paycheckId },
      data: {
        ...(status ? { status } : {}),
        ...(status === 'paid' ? { paidAt: new Date() } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(paymentRef !== undefined ? { paymentRef } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ paycheck: updated });
  } catch (error) {
    console.error('PATCH paycheck', error);
    return NextResponse.json({ error: 'Failed to update paycheck' }, { status: 500 });
  }
}
