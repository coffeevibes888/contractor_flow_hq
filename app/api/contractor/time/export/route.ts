import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET - Export time entries for payroll
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, businessName: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json'; // json or csv

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const entries = await prisma.contractorTimeEntry.findMany({
      where: {
        employee: {
          contractorId: contractorProfile.id,
        },
        clockIn: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        clockOut: { not: null },
        status: 'approved',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            payRate: true,
          },
        },
      },
      orderBy: [{ employee: { lastName: 'asc' } }, { clockIn: 'asc' }],
    });

    // Calculate totals per employee
    const employeeSummary = entries.reduce((acc, entry) => {
      if (!entry.employee) return acc;
      const employeeId = entry.employee.id;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employee: entry.employee,
          totalHours: 0,
          totalCost: 0,
          entries: [],
        };
      }

      const hours =
        (new Date(entry.clockOut!).getTime() -
          new Date(entry.clockIn).getTime()) /
          (1000 * 60 * 60) -
        (entry.breakMinutes || 0) / 60;

      const cost = hours * Number(entry.employee.payRate);

      acc[employeeId].totalHours += hours;
      acc[employeeId].totalCost += cost;
      acc[employeeId].entries.push({
        date: entry.clockIn,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        hours: hours.toFixed(2),
        cost: cost.toFixed(2),
        notes: entry.notes,
      });

      return acc;
    }, {} as Record<string, any>);

    if (format === 'csv') {
      // Generate CSV
      let csv = 'Employee ID,Employee Name,Email,Date,Clock In,Clock Out,Hours,Hourly Rate,Cost,Notes\n';

      Object.values(employeeSummary).forEach((summary: any) => {
        summary.entries.forEach((entry: any) => {
          csv += `${summary.employee.id},"${summary.employee.firstName} ${summary.employee.lastName}",${summary.employee.email || ''},${new Date(entry.date).toLocaleDateString()},${new Date(entry.clockIn).toLocaleTimeString()},${new Date(entry.clockOut).toLocaleTimeString()},${entry.hours},${summary.employee.payRate},${entry.cost},"${entry.notes || ''}"\n`;
        });
      });

      // Add summary
      csv += '\n\nSummary\n';
      csv += 'Employee,Total Hours,Total Cost\n';
      Object.values(employeeSummary).forEach((summary: any) => {
        csv += `"${summary.employee.firstName} ${summary.employee.lastName}",${summary.totalHours.toFixed(2)},${summary.totalCost.toFixed(2)}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payroll-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      period: {
        startDate,
        endDate,
      },
      summary: Object.values(employeeSummary).map((s: any) => ({
        employee: s.employee,
        totalHours: parseFloat(s.totalHours.toFixed(2)),
        totalCost: parseFloat(s.totalCost.toFixed(2)),
        entries: s.entries,
      })),
      grandTotal: {
        hours: Object.values(employeeSummary).reduce(
          (sum: number, s: any) => sum + s.totalHours,
          0
        ),
        cost: Object.values(employeeSummary).reduce(
          (sum: number, s: any) => sum + s.totalCost,
          0
        ),
      },
    });
  } catch (error) {
    console.error('Error exporting time entries:', error);
    return NextResponse.json(
      { error: 'Failed to export time entries' },
      { status: 500 }
    );
  }
}
