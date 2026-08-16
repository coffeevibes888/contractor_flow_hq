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
    const period = searchParams.get('period') || 'quarterly'; // quarterly, yearly
    const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : null;

    // Get landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Build property filter
    const propertyFilter = propertyId 
      ? { id: propertyId, landlordId: landlord.id }
      : { landlordId: landlord.id };

    // Get properties with all related data
    const properties = await prisma.property.findMany({
      where: propertyFilter,
      include: {
        units: {
          include: {
            leases: {
              include: {
                rentPayments: true,
                tenant: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        expenses: true,
      },
    });

    if (properties.length === 0) {
      // Return empty report structure instead of error
      return NextResponse.json({
        reportType: 'investor',
        period,
        periodLabel: quarter ? `Q${quarter} ${year}` : `${year}`,
        quarter,
        year,
        generatedAt: new Date().toISOString(),
        preparedBy: landlord.owner?.name || landlord.name || 'Property Manager',
        executiveSummary: {
          totalIncome: 0,
          totalExpenses: 0,
          netOperatingIncome: 0,
          incomeGrowth: '0',
          expenseGrowth: '0',
          netGrowth: '0',
          previousPeriodIncome: 0,
          previousPeriodExpenses: 0,
          previousPeriodNet: 0,
        },
        portfolio: {
          propertyCount: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: '0',
          avgRentPerUnit: 0,
        },
        metrics: {
          grossYield: '0',
          operatingExpenseRatio: '0',
          cashOnCashReturn: 'N/A',
          capRate: 'N/A',
        },
        propertyPerformance: [],
        topProperties: [],
        charts: {
          monthlyTrend: [],
          expenseBreakdown: [],
          incomeVsExpenses: [],
          occupancyTrend: [],
        },
        collectionSummary: {
          totalDue: 0,
          collected: 0,
          outstanding: 0,
          collectionRate: 100,
        },
        leaseSummary: {
          activeLeases: 0,
          expiringIn30Days: 0,
          expiringIn90Days: 0,
          monthToMonth: 0,
        },
        transactions: {
          incomeCount: 0,
          expenseCount: 0,
        },
      });
    }

    // Calculate date ranges
    let startDate: Date, endDate: Date, periodLabel: string;
    
    if (period === 'quarterly' && quarter) {
      const quarterStartMonth = (quarter - 1) * 3;
      startDate = new Date(year, quarterStartMonth, 1);
      endDate = new Date(year, quarterStartMonth + 3, 0);
      periodLabel = `Q${quarter} ${year}`;
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      periodLabel = `${year}`;
    }

    // Get previous period for comparison
    let prevStartDate: Date, prevEndDate: Date;
    if (period === 'quarterly' && quarter) {
      if (quarter === 1) {
        prevStartDate = new Date(year - 1, 9, 1);
        prevEndDate = new Date(year - 1, 11, 31);
      } else {
        const prevQuarterStart = (quarter - 2) * 3;
        prevStartDate = new Date(year, prevQuarterStart, 1);
        prevEndDate = new Date(year, prevQuarterStart + 3, 0);
      }
    } else {
      prevStartDate = new Date(year - 1, 0, 1);
      prevEndDate = new Date(year - 1, 11, 31);
    }

    // Generate comprehensive investor report
    const report = generateInvestorReport(
      properties,
      landlord,
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      periodLabel,
      period,
      quarter
    );

    return NextResponse.json(report);
  } catch (error) {
    console.error('Investor report error:', error);
    return NextResponse.json({ message: 'Failed to generate report' }, { status: 500 });
  }
}

function generateInvestorReport(
  properties: any[],
  landlord: any,
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
  periodLabel: string,
  period: string,
  quarter: number | null
) {
  // Current period data
  const currentData = calculatePeriodData(properties, startDate, endDate);
  // Previous period data for comparison
  const previousData = calculatePeriodData(properties, prevStartDate, prevEndDate);

  // Calculate growth rates
  const incomeGrowth = previousData.totalIncome > 0
    ? ((currentData.totalIncome - previousData.totalIncome) / previousData.totalIncome * 100)
    : 0;
  const expenseGrowth = previousData.totalExpenses > 0
    ? ((currentData.totalExpenses - previousData.totalExpenses) / previousData.totalExpenses * 100)
    : 0;
  const netGrowth = previousData.netIncome !== 0
    ? ((currentData.netIncome - previousData.netIncome) / Math.abs(previousData.netIncome) * 100)
    : 0;

  // Portfolio overview
  const totalUnits = properties.reduce((sum, p) => sum + p.units.length, 0);
  const occupiedUnits = properties.reduce((sum, p) => 
    sum + p.units.filter((u: any) => !u.isAvailable).length, 0);
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits * 100) : 0;

  // Property performance
  const propertyPerformance = properties.map(property => {
    const propData = calculatePropertyData(property, startDate, endDate);
    const prevPropData = calculatePropertyData(property, prevStartDate, prevEndDate);
    
    return {
      id: property.id,
      name: property.name,
      address: formatAddress(property.address),
      units: property.units.length,
      occupiedUnits: property.units.filter((u: any) => !u.isAvailable).length,
      occupancyRate: property.units.length > 0 
        ? Math.round(property.units.filter((u: any) => !u.isAvailable).length / property.units.length * 100)
        : 0,
      income: propData.income,
      expenses: propData.expenses,
      noi: propData.income - propData.expenses, // Net Operating Income
      incomeChange: prevPropData.income > 0 
        ? ((propData.income - prevPropData.income) / prevPropData.income * 100).toFixed(1)
        : '0',
      collectionRate: propData.totalDue > 0 
        ? Math.round(propData.collected / propData.totalDue * 100)
        : 100,
    };
  });

  // Monthly trend data for charts
  const monthlyTrend = generateMonthlyTrend(properties, startDate, endDate);

  // Expense breakdown for pie chart
  const expenseBreakdown = currentData.expensesByCategory;

  // Top performing properties
  const topProperties = [...propertyPerformance]
    .sort((a, b) => b.noi - a.noi)
    .slice(0, 5);

  // Collection summary
  const collectionSummary = {
    totalDue: currentData.totalDue,
    collected: currentData.collected,
    outstanding: currentData.totalDue - currentData.collected,
    collectionRate: currentData.totalDue > 0 
      ? Math.round(currentData.collected / currentData.totalDue * 100)
      : 100,
  };

  // Lease summary
  const leaseSummary = calculateLeaseSummary(properties, endDate);

  return {
    reportType: 'investor',
    period,
    periodLabel,
    quarter,
    year: startDate.getFullYear(),
    generatedAt: new Date().toISOString(),
    preparedBy: landlord.owner?.name || landlord.name || 'Property Manager',
    
    // Executive Summary
    executiveSummary: {
      totalIncome: currentData.totalIncome,
      totalExpenses: currentData.totalExpenses,
      netOperatingIncome: currentData.netIncome,
      incomeGrowth: incomeGrowth.toFixed(1),
      expenseGrowth: expenseGrowth.toFixed(1),
      netGrowth: netGrowth.toFixed(1),
      previousPeriodIncome: previousData.totalIncome,
      previousPeriodExpenses: previousData.totalExpenses,
      previousPeriodNet: previousData.netIncome,
    },

    // Portfolio Overview
    portfolio: {
      propertyCount: properties.length,
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      occupancyRate: occupancyRate.toFixed(1),
      avgRentPerUnit: occupiedUnits > 0 
        ? Math.round(currentData.totalIncome / occupiedUnits / (period === 'quarterly' ? 3 : 12))
        : 0,
    },

    // Financial Metrics
    metrics: {
      grossYield: currentData.totalIncome > 0 
        ? ((currentData.netIncome / currentData.totalIncome) * 100).toFixed(2)
        : '0',
      operatingExpenseRatio: currentData.totalIncome > 0
        ? ((currentData.totalExpenses / currentData.totalIncome) * 100).toFixed(2)
        : '0',
      cashOnCashReturn: 'N/A', // Would need investment data
      capRate: 'N/A', // Would need property value data
    },

    // Property Performance
    propertyPerformance,
    topProperties,

    // Charts Data
    charts: {
      monthlyTrend,
      expenseBreakdown: Object.entries(expenseBreakdown).map(([category, amount]) => ({
        category: formatCategory(category),
        amount: amount as number,
        percentage: currentData.totalExpenses > 0 
          ? ((amount as number) / currentData.totalExpenses * 100).toFixed(1)
          : '0',
      })),
      incomeVsExpenses: monthlyTrend.map(m => ({
        month: m.month,
        income: m.income,
        expenses: m.expenses,
      })),
      occupancyTrend: monthlyTrend.map(m => ({
        month: m.month,
        rate: m.occupancyRate || occupancyRate,
      })),
    },

    // Collection Summary
    collectionSummary,

    // Lease Summary
    leaseSummary,

    // Detailed Transactions (for appendix)
    transactions: {
      incomeCount: currentData.payments.length,
      expenseCount: currentData.expenses.length,
    },
  };
}

function calculatePeriodData(properties: any[], startDate: Date, endDate: Date) {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalDue = 0;
  let collected = 0;
  const payments: any[] = [];
  const expenses: any[] = [];
  const expensesByCategory: Record<string, number> = {};

  properties.forEach(property => {
    property.units.forEach((unit: any) => {
      unit.leases.forEach((lease: any) => {
        lease.rentPayments.forEach((payment: any) => {
          const paymentDate = new Date(payment.dueDate);
          if (paymentDate >= startDate && paymentDate <= endDate) {
            const amount = Number(payment.amount);
            totalDue += amount;
            if (payment.status === 'paid') {
              totalIncome += amount;
              collected += amount;
            }
            payments.push(payment);
          }
        });
      });
    });

    property.expenses.forEach((expense: any) => {
      const expenseDate = new Date(expense.incurredAt || expense.createdAt);
      if (expenseDate >= startDate && expenseDate <= endDate) {
        const amount = Number(expense.amount);
        totalExpenses += amount;
        const cat = expense.category || 'other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amount;
        expenses.push(expense);
      }
    });
  });

  return {
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    totalDue,
    collected,
    payments,
    expenses,
    expensesByCategory,
  };
}

function calculatePropertyData(property: any, startDate: Date, endDate: Date) {
  let income = 0;
  let expenses = 0;
  let totalDue = 0;
  let collected = 0;

  property.units.forEach((unit: any) => {
    unit.leases.forEach((lease: any) => {
      lease.rentPayments.forEach((payment: any) => {
        const paymentDate = new Date(payment.dueDate);
        if (paymentDate >= startDate && paymentDate <= endDate) {
          const amount = Number(payment.amount);
          totalDue += amount;
          if (payment.status === 'paid') {
            income += amount;
            collected += amount;
          }
        }
      });
    });
  });

  property.expenses.forEach((expense: any) => {
    const expenseDate = new Date(expense.incurredAt || expense.createdAt);
    if (expenseDate >= startDate && expenseDate <= endDate) {
      expenses += Number(expense.amount);
    }
  });

  return { income, expenses, totalDue, collected };
}

function generateMonthlyTrend(properties: any[], startDate: Date, endDate: Date) {
  const months: any[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    let income = 0;
    let expenses = 0;

    properties.forEach(property => {
      property.units.forEach((unit: any) => {
        unit.leases.forEach((lease: any) => {
          lease.rentPayments.forEach((payment: any) => {
            const d = new Date(payment.dueDate);
            if (d >= monthStart && d <= monthEnd && payment.status === 'paid') {
              income += Number(payment.amount);
            }
          });
        });
      });

      property.expenses.forEach((expense: any) => {
        const d = new Date(expense.incurredAt || expense.createdAt);
        if (d >= monthStart && d <= monthEnd) {
          expenses += Number(expense.amount);
        }
      });
    });

    months.push({
      month: current.toLocaleString('default', { month: 'short' }),
      year,
      income,
      expenses,
      net: income - expenses,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function calculateLeaseSummary(properties: any[], asOfDate: Date) {
  let activeLeases = 0;
  let expiringIn30Days = 0;
  let expiringIn90Days = 0;
  let monthToMonth = 0;

  const thirtyDays = new Date(asOfDate);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const ninetyDays = new Date(asOfDate);
  ninetyDays.setDate(ninetyDays.getDate() + 90);

  properties.forEach(property => {
    property.units.forEach((unit: any) => {
      unit.leases.forEach((lease: any) => {
        if (lease.status === 'active') {
          activeLeases++;
          if (!lease.endDate) {
            monthToMonth++;
          } else {
            const endDate = new Date(lease.endDate);
            if (endDate <= thirtyDays) expiringIn30Days++;
            else if (endDate <= ninetyDays) expiringIn90Days++;
          }
        }
      });
    });
  });

  return {
    activeLeases,
    expiringIn30Days,
    expiringIn90Days,
    monthToMonth,
  };
}

function formatAddress(address: any): string {
  if (!address || typeof address !== 'object') return '';
  return `${address.street || ''}, ${address.city || ''}, ${address.state || ''}`.trim();
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
