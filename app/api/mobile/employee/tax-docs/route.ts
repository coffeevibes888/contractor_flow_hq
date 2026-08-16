/**
 * GET /api/mobile/employee/tax-docs
 *
 * Returns YTD wage summary the employee can use for self-prep, plus a list of
 * tax documents (W-2 / 1099-NEC / W-4 / I-9) once they're stored on the employee.
 *
 * For now actual document URLs come from ContractorEmployee.documents (string[])
 * — when you add a structured EmployeeDocument model later, this endpoint can
 * be enriched without changing the mobile contract.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const db = prisma as any;
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const contractorEmp = await db.contractorEmployee.findFirst({
      where: { userId: payload.userId },
      select: {
        id: true,
        employeeType: true,
        documents: true,
        firstName: true,
        lastName: true,
      },
    });

    let employeeType: 'w2' | '1099' | 'subcontractor' = 'w2';
    let docs: { kind: string; url: string; year?: number }[] = [];
    let ytdGross = 0;
    let ytdNet = 0;
    let ytdTax = 0;

    if (contractorEmp) {
      employeeType = contractorEmp.employeeType ?? 'w2';
      // Best-effort: documents column is just an array of URLs at the moment.
      docs = (contractorEmp.documents ?? []).map((url: string) => {
        const lower = url.toLowerCase();
        const kind = /w2/.test(lower) ? 'W-2'
          : /1099/.test(lower) ? '1099-NEC'
          : /w4/.test(lower) ? 'W-4'
          : /i9/.test(lower) ? 'I-9'
          : 'Document';
        return { kind, url };
      });

      const ytd = await db.contractorPaycheck.findMany({
        where: { employeeId: contractorEmp.id, createdAt: { gte: yearStart } },
        select: { grossPay: true, netPay: true, deductions: true },
      });
      ytdGross = ytd.reduce((s: number, p: any) => s + Number(p.grossPay ?? 0), 0);
      ytdNet = ytd.reduce((s: number, p: any) => s + Number(p.netPay ?? 0), 0);
      ytdTax = ytd.reduce((s: number, p: any) => {
        const ds = Array.isArray(p.deductions) ? p.deductions : [];
        return s + ds
          .filter((d: any) => /tax|fica|medicare|federal|state/i.test(d.label ?? ''))
          .reduce((sub: number, d: any) => sub + Number(d.amount ?? 0), 0);
      }, 0);
    }

    return NextResponse.json({
      employeeType,
      documents: docs,
      ytd: {
        gross: ytdGross,
        net: ytdNet,
        tax: ytdTax,
        deductions: ytdGross - ytdNet,
      },
      isThresholdReached: employeeType === '1099' || employeeType === 'subcontractor'
        ? ytdGross >= 600
        : null,
    });
  } catch (error) {
    console.error('[mobile/employee/tax-docs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
