import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { redirect } from 'next/navigation';
import TimesheetsClient from './timesheets-client';

export default async function TimesheetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const employee = await prisma.contractorEmployee.findFirst({
    where: { userId: session.user.id, status: 'active' },
    select: { id: true, contractorId: true, payRate: true, payType: true },
  });

  if (!employee) redirect('/team-start');

  // Get current pay period (last 14 days as default biweekly)
  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 13);
  periodStart.setHours(0, 0, 0, 0);

  // Fetch time entries for this period
  const timeEntries = await prisma.contractorTimeEntry.findMany({
    where: {
      employeeId: employee.id,
      contractorId: employee.contractorId,
      clockIn: { gte: periodStart },
      clockOut: { not: null },
    },
    select: {
      id: true,
      clockIn: true,
      clockOut: true,
      breakMinutes: true,
      billableHours: true,
      hourlyRate: true,
      totalAmount: true,
      status: true,
      notes: true,
      jobId: true,
    },
    orderBy: { clockIn: 'desc' },
  });

  // Fetch paychecks (pay stubs)
  const db = prisma as any;
  const paychecks = await db.contractorPaycheck.findMany({
    where: {
      employeeId: employee.id,
      contractorId: employee.contractorId,
    },
    select: {
      id: true,
      payType: true,
      regularHours: true,
      overtimeHours: true,
      payRate: true,
      regularPay: true,
      overtimePay: true,
      grossPay: true,
      totalDeductions: true,
      netPay: true,
      status: true,
      paidAt: true,
      notes: true,
      createdAt: true,
      payroll: {
        select: { periodStart: true, periodEnd: true, payDate: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  }).catch(() => []);

  return (
    <TimesheetsClient
      payRate={Number(employee.payRate)}
      payType={employee.payType}
      periodStart={periodStart.toISOString()}
      periodEnd={periodEnd.toISOString()}
      timeEntries={timeEntries.map((e) => ({
        id: e.id,
        clockIn: e.clockIn.toISOString(),
        clockOut: e.clockOut!.toISOString(),
        breakMinutes: e.breakMinutes,
        billableHours: e.billableHours ? Number(e.billableHours) : null,
        hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : null,
        totalAmount: e.totalAmount ? Number(e.totalAmount) : null,
        status: e.status,
        notes: e.notes,
        jobId: e.jobId,
      }))}
      paychecks={paychecks.map((p: any) => ({
        id: p.id,
        regularHours: Number(p.regularHours),
        overtimeHours: Number(p.overtimeHours),
        payRate: Number(p.payRate),
        regularPay: Number(p.regularPay),
        overtimePay: Number(p.overtimePay),
        grossPay: Number(p.grossPay),
        totalDeductions: Number(p.totalDeductions),
        netPay: Number(p.netPay),
        status: p.status,
        paidAt: p.paidAt?.toISOString() || null,
        notes: p.notes,
        periodStart: p.payroll?.periodStart?.toISOString() || null,
        periodEnd: p.payroll?.periodEnd?.toISOString() || null,
        payDate: p.payroll?.payDate?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
