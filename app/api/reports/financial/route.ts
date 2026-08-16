import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const period = searchParams.get('period') || 'yearly'; // yearly, quarterly, monthly
    const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : null;
    const format = searchParams.get('format') || 'json'; // json, csv, pdf

    // Get landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Build property filter
    const propertyFilter = propertyId 
      ? { id: propertyId, landlordId: landlord.id }
      : { landlordId: landlord.id };

    // Get properties with financial data
    const properties = await prisma.property.findMany({
      where: propertyFilter,
      include: {
        units: {
          include: {
            leases: {
              include: {
                rentPayments: true,
              },
            },
          },
        },
        expenses: true,
      },
    });

    // Calculate date range based on period
    let startDate: Date, endDate: Date;
    
    if (period === 'quarterly' && quarter) {
      const quarterStartMonth = (quarter - 1) * 3;
      startDate = new Date(year, quarterStartMonth, 1);
      endDate = new Date(year, quarterStartMonth + 3, 0);
    } else if (period === 'monthly') {
      const month = parseInt(searchParams.get('month') || '1') - 1;
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    // Aggregate financial data
    const reportData = generateFinancialReport(properties, startDate, endDate, period, quarter);

    if (format === 'csv') {
      const csv = generateCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="financial-report-${year}${quarter ? `-Q${quarter}` : ''}.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      // Return data for client-side PDF generation
      return NextResponse.json({
        ...reportData,
        _pdfReady: true,
      });
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Financial report error:', error);
    return NextResponse.json({ message: 'Failed to generate report' }, { status: 500 });
  }
}

function generateFinancialReport(
  properties: any[],
  startDate: Date,
  endDate: Date,
  period: string,
  quarter: number | null
) {
  const allPayments: any[] = [];
  const allExpenses: any[] = [];

  properties.forEach(property => {
    property.units.forEach((unit: any) => {
      unit.leases.forEach((lease: any) => {
        lease.rentPayments.forEach((payment: any) => {
          const paymentDate = new Date(payment.dueDate);
          if (paymentDate >= startDate && paymentDate <= endDate) {
            allPayments.push({
              ...payment,
              propertyName: property.name,
              unitName: unit.name,
              propertyId: property.id,
            });
          }
        });
      });
    });

    property.expenses.forEach((expense: any) => {
      const expenseDate = new Date(expense.incurredAt || expense.createdAt);
      if (expenseDate >= startDate && expenseDate <= endDate) {
        allExpenses.push({
          ...expense,
          propertyName: property.name,
          propertyId: property.id,
        });
      }
    });
  });

  // Calculate totals
  const totalIncome = allPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netIncome = totalIncome - totalExpenses;

  // Group by property
  const byProperty = properties.map(property => {
    const propertyPayments = allPayments.filter(p => p.propertyId === property.id);
    const propertyExpenses = allExpenses.filter(e => e.propertyId === property.id);
    
    const income = propertyPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const expenses = propertyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      id: property.id,
      name: property.name,
      address: property.address,
      income,
      expenses,
      net: income - expenses,
      occupancyRate: calculateOccupancy(property),
      unitCount: property.units.length,
    };
  });

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  allExpenses.forEach(e => {
    const cat = e.category || 'other';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount);
  });

  // Monthly breakdown
  const monthlyData = generateMonthlyBreakdown(allPayments, allExpenses, startDate, endDate);

  // Calculate metrics
  const metrics = {
    roi: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : '0',
    expenseRatio: totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(2) : '0',
    avgMonthlyIncome: monthlyData.length > 0 
      ? (totalIncome / monthlyData.filter(m => m.income > 0).length || 1).toFixed(2)
      : '0',
    avgMonthlyExpenses: monthlyData.length > 0
      ? (totalExpenses / monthlyData.filter(m => m.expenses > 0).length || 1).toFixed(2)
      : '0',
  };

  return {
    period,
    year: startDate.getFullYear(),
    quarter,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    generatedAt: new Date().toISOString(),
    summary: {
      totalIncome,
      totalExpenses,
      netIncome,
      propertyCount: properties.length,
      totalUnits: properties.reduce((sum, p) => sum + p.units.length, 0),
    },
    metrics,
    byProperty,
    expensesByCategory,
    monthlyData,
    payments: allPayments.map(p => ({
      date: p.dueDate,
      amount: Number(p.amount),
      status: p.status,
      property: p.propertyName,
      unit: p.unitName,
    })),
    expenses: allExpenses.map(e => ({
      date: e.incurredAt || e.createdAt,
      amount: Number(e.amount),
      category: e.category,
      description: e.description,
      property: e.propertyName,
    })),
  };
}

function calculateOccupancy(property: any): number {
  const totalUnits = property.units.length;
  if (totalUnits === 0) return 0;
  const occupiedUnits = property.units.filter((u: any) => !u.isAvailable).length;
  return Math.round((occupiedUnits / totalUnits) * 100);
}

function generateMonthlyBreakdown(
  payments: any[],
  expenses: any[],
  startDate: Date,
  endDate: Date
) {
  const months: any[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    
    const monthPayments = payments.filter(p => {
      const d = new Date(p.dueDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.incurredAt || e.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const income = monthPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const expenseTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    months.push({
      month: current.toLocaleString('default', { month: 'short' }),
      monthIndex: month,
      year,
      income,
      expenses: expenseTotal,
      net: income - expenseTotal,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function generateCSV(data: any): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Financial Report');
  lines.push(`Period: ${data.period} ${data.year}${data.quarter ? ` Q${data.quarter}` : ''}`);
  lines.push(`Generated: ${new Date(data.generatedAt).toLocaleString()}`);
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Income,$${data.summary.totalIncome.toFixed(2)}`);
  lines.push(`Total Expenses,$${data.summary.totalExpenses.toFixed(2)}`);
  lines.push(`Net Income,$${data.summary.netIncome.toFixed(2)}`);
  lines.push(`Properties,${data.summary.propertyCount}`);
  lines.push(`Total Units,${data.summary.totalUnits}`);
  lines.push('');

  // By Property
  lines.push('BY PROPERTY');
  lines.push('Property,Income,Expenses,Net,Occupancy');
  data.byProperty.forEach((p: any) => {
    lines.push(`"${p.name}",$${p.income.toFixed(2)},$${p.expenses.toFixed(2)},$${p.net.toFixed(2)},${p.occupancyRate}%`);
  });
  lines.push('');

  // Monthly Breakdown
  lines.push('MONTHLY BREAKDOWN');
  lines.push('Month,Income,Expenses,Net');
  data.monthlyData.forEach((m: any) => {
    lines.push(`${m.month} ${m.year},$${m.income.toFixed(2)},$${m.expenses.toFixed(2)},$${m.net.toFixed(2)}`);
  });
  lines.push('');

  // Expense Categories
  lines.push('EXPENSES BY CATEGORY');
  lines.push('Category,Amount');
  Object.entries(data.expensesByCategory).forEach(([cat, amount]) => {
    lines.push(`"${cat.replace(/_/g, ' ')}",$${(amount as number).toFixed(2)}`);
  });

  return lines.join('\n');
}
