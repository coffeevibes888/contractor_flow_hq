import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can, meetsMinTier } from '@/lib/contractor-auth';

// ── helpers ──────────────────────────────────────────────────────────────────

function calcHours(clockIn: Date, clockOut: Date, breakMinutes: number): number {
  return Math.max(
    0,
    (clockOut.getTime() - clockIn.getTime()) / 3_600_000 - breakMinutes / 60,
  );
}

interface DeductionLine {
  label: string;
  amount: number;
  type: string; // federal_tax, state_tax, social_security, medicare, health, other
}

// Very lightweight flat-rate withholding estimate (contractor can override deductions in UI)
function estimateDeductions(grossPay: number, employeeType: string): DeductionLine[] {
  if (employeeType === '1099') return []; // 1099s handle their own taxes
  const lines: DeductionLine[] = [];
  if (grossPay <= 0) return lines;
  lines.push({ label: 'Federal Income Tax (est.)', amount: parseFloat((grossPay * 0.12).toFixed(2)), type: 'federal_tax' });
  lines.push({ label: 'Social Security (6.2%)', amount: parseFloat((grossPay * 0.062).toFixed(2)), type: 'social_security' });
  lines.push({ label: 'Medicare (1.45%)', amount: parseFloat((grossPay * 0.0145).toFixed(2)), type: 'medicare' });
  return lines;
}

// ── GET — list payroll runs ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    if (!meetsMinTier(contractorAuth, 'pro')) return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    if (!can(contractorAuth, 'payroll.view')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const contractorProfile = { id: contractorAuth.contractorId };
    const db = prisma as any;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const take = parseInt(searchParams.get('take') || '20', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const payrolls = await db.contractorPayroll.findMany({
      where: {
        contractorId: contractorProfile.id,
        ...(status ? { status } : {}),
      },
      include: {
        paychecks: {
          select: {
            id: true,
            status: true,
            grossPay: true,
            netPay: true,
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { periodStart: 'desc' },
      take,
      skip,
    });

    const total = await db.contractorPayroll.count({
      where: { contractorId: contractorProfile.id, ...(status ? { status } : {}) },
    });

    return NextResponse.json({ payrolls, total });
  } catch (error) {
    console.error('GET /api/contractor/payroll', error);
    return NextResponse.json({ error: 'Failed to fetch payroll runs' }, { status: 500 });
  }
}

// ── POST — create & run a new payroll ────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    if (!meetsMinTier(contractorAuth, 'pro')) return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    if (!can(contractorAuth, 'payroll.run')) return NextResponse.json({ error: 'Insufficient permissions — payroll.run required' }, { status: 403 });

    const contractorProfile = { id: contractorAuth.contractorId };
    const db = prisma as any;

    const body = await req.json();
    const { periodStart, periodEnd, payDate, paySchedule, employeeIds, notes } = body as {
      periodStart: string;
      periodEnd: string;
      payDate: string;
      paySchedule?: string;
      employeeIds?: string[]; // if omitted → all active employees
      notes?: string;
    };

    if (!periodStart || !periodEnd || !payDate) {
      return NextResponse.json({ error: 'periodStart, periodEnd, and payDate are required' }, { status: 400 });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Fetch employees
    const employees = await db.contractorEmployee.findMany({
      where: {
        contractorId: contractorProfile.id,
        status: 'active',
        ...(employeeIds?.length ? { id: { in: employeeIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        payRate: true,
        payType: true,
        employeeType: true,
        timeEntries: {
          where: {
            clockIn: { gte: start },
            clockOut: { lte: end, not: null },
            status: 'approved',
          },
          select: {
            id: true,
            clockIn: true,
            clockOut: true,
            breakMinutes: true,
          },
        },
        timeOffRequests: {
          where: {
            startDate: { gte: start },
            endDate: { lte: end },
            status: 'approved',
          },
          select: { hours: true, type: true },
        },
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No active employees found for this period' }, { status: 400 });
    }

    // ── Create the payroll run in a transaction ─────────────────────────────
    const payroll = await prisma.$transaction(async (tx) => {
      const run = await (tx as any).contractorPayroll.create({
        data: {
          contractorId: contractorProfile.id,
          periodStart: start,
          periodEnd: end,
          payDate: new Date(payDate),
          paySchedule: paySchedule || 'biweekly',
          status: 'processing',
          runAt: new Date(),
          runBy: session.user!.id,
          notes: notes || null,
        },
      });

      let totalGross = 0;
      let totalDed = 0;
      let totalNet = 0;

      for (const emp of employees) {
        const rate = Number(emp.payRate);
        let regularHours = 0;
        let overtimeHours = 0;
        const entryIds: string[] = [];

        if (emp.payType === 'hourly') {
          for (const entry of emp.timeEntries) {
            if (!entry.clockOut) continue;
            const h = calcHours(entry.clockIn, entry.clockOut, entry.breakMinutes);
            regularHours += h;
            entryIds.push(entry.id);
          }
          // Standard OT: anything over 40 hrs/week
          // Simple weekly OT based on total hours (approximate for a period)
          if (regularHours > 40) {
            overtimeHours = regularHours - 40;
            regularHours = 40;
          }
        }

        // PTO pay (use same pay rate)
        const ptoHours = emp.timeOffRequests.reduce((sum: number, r: { hours: unknown }) => sum + Number(r.hours), 0);
        const ptoPay = ptoHours * rate;

        const regularPay = regularHours * rate;
        const overtimeRate = rate * 1.5;
        const overtimePay = overtimeHours * overtimeRate;
        const grossPay = emp.payType === 'salary'
          ? rate // salary payRate is already per-period
          : regularPay + overtimePay + ptoPay;

        const deductionLines = estimateDeductions(grossPay, emp.employeeType);
        const totalDeductionsAmt = deductionLines.reduce((s, d) => s + d.amount, 0);
        const netPay = grossPay - totalDeductionsAmt;

        totalGross += grossPay;
        totalDed += totalDeductionsAmt;
        totalNet += netPay;

        await (tx as any).contractorPaycheck.create({
          data: {
            payrollId: run.id,
            employeeId: emp.id,
            contractorId: contractorProfile.id,
            payType: emp.payType,
            regularHours,
            overtimeHours,
            payRate: rate,
            overtimeRate,
            ptoHours,
            ptoPay,
            regularPay,
            overtimePay,
            grossPay,
            deductions: deductionLines,
            totalDeductions: totalDeductionsAmt,
            netPay,
            timeEntryIds: entryIds,
            status: 'pending',
          },
        });
      }

      // Update payroll totals
      const updated = await (tx as any).contractorPayroll.update({
        where: { id: run.id },
        data: {
          totalGrossPay: totalGross,
          totalDeductions: totalDed,
          totalNetPay: totalNet,
          employeeCount: employees.length,
          status: 'completed',
        },
        include: {
          paychecks: {
            include: { employee: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ payroll }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contractor/payroll', error);
    return NextResponse.json({ error: 'Failed to run payroll' }, { status: 500 });
  }
}
