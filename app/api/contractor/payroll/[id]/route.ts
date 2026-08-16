import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can, meetsMinTier } from '@/lib/contractor-auth';

// ── GET — single payroll run with all paychecks ───────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    if (!meetsMinTier(contractorAuth, 'pro')) return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    if (!can(contractorAuth, 'payroll.view')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const contractorProfile = { id: contractorAuth.contractorId };
    const db = prisma as any;

    const payroll = await db.contractorPayroll.findUnique({
      where: { id: params.id, contractorId: contractorProfile.id },
      include: {
        paychecks: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                payRate: true,
                payType: true,
                employeeType: true,
              },
            },
          },
          orderBy: [{ employee: { lastName: 'asc' } }],
        },
      },
    });

    if (!payroll) return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });

    return NextResponse.json({ payroll });
  } catch (error) {
    console.error('GET /api/contractor/payroll/[id]', error);
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}

// ── PATCH — update payroll or cancel it ──────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    if (!meetsMinTier(contractorAuth, 'pro')) return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    if (!can(contractorAuth, 'payroll.edit')) return NextResponse.json({ error: 'Insufficient permissions — payroll.edit required' }, { status: 403 });

    const contractorProfile = { id: contractorAuth.contractorId };
    const db = prisma as any;

    const existing = await db.contractorPayroll.findUnique({
      where: { id: params.id, contractorId: contractorProfile.id },
    });
    if (!existing) return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });

    const body = await req.json();
    const { status, notes } = body as { status?: string; notes?: string };

    const allowed = ['draft', 'processing', 'completed', 'cancelled'];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await db.contractorPayroll.update({
      where: { id: params.id },
      data: { ...(status ? { status } : {}), ...(notes !== undefined ? { notes } : {}) },
    });

    return NextResponse.json({ payroll: updated });
  } catch (error) {
    console.error('PATCH /api/contractor/payroll/[id]', error);
    return NextResponse.json({ error: 'Failed to update payroll' }, { status: 500 });
  }
}
