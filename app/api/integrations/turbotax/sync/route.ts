import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { landlordId } = await request.json();

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Landlord ID required' }, { status: 400 });
    }

    // Verify user owns this landlord
    const landlord = await prisma.landlord.findFirst({
      where: {
        id: landlordId,
        ownerUserId: session.user.id,
      },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Get tax data for the current tax year
    const taxYear = new Date().getFullYear() - 1; // Previous year
    const startDate = new Date(taxYear, 0, 1); // January 1st
    const endDate = new Date(taxYear, 11, 31); // December 31st

    const properties = await prisma.property.findMany({
      where: { landlordId },
      include: {
        units: {
          include: {
            leases: {
              include: {
                rentPayments: {
                  where: {
                    status: 'paid',
                    paidAt: { gte: startDate, lte: endDate },
                  },
                },
                tenant: true,
              },
            },
          },
        },
      },
    });

    // Calculate tax data
    const taxData = {
      taxYear,
      landlordInfo: {
        name: landlord.name,
        ein: 'XX-XXXXXXX', // Would be stored in landlord profile
      },
      properties: properties.map(property => {
        const propertyUnits = property.units;
        const activeLeases = propertyUnits.filter(unit => unit.leases.length > 0);
        
        const totalRentReceived = activeLeases.reduce((sum, unit) => {
          const lease = unit.leases[0];
          const yearlyRent = lease?.rentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
          return sum + yearlyRent;
        }, 0);

        const estimatedExpenses = propertyUnits.length * 1200; // Mock expenses
        const depreciation = propertyUnits.length * 800; // Mock depreciation

        return {
          propertyName: property.name,
          address: 'Property Address', // Would come from property data
          totalRentReceived,
          expenses: {
            maintenance: estimatedExpenses * 0.3,
            insurance: estimatedExpenses * 0.2,
            propertyTax: estimatedExpenses * 0.25,
            utilities: estimatedExpenses * 0.15,
            other: estimatedExpenses * 0.1,
          },
          depreciation,
          netIncome: totalRentReceived - estimatedExpenses - depreciation,
        };
      }),
      summary: {
        totalRentReceived: properties.reduce((sum, prop) => {
          return sum + prop.units.filter(unit => unit.leases.length > 0).reduce((sum, unit) => {
            const lease = unit.leases[0];
            return sum + (lease?.rentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0);
          }, 0);
        }, 0),
        totalExpenses: properties.reduce((sum, prop) => sum + prop.units.length * 1200, 0),
        totalDepreciation: properties.reduce((sum, prop) => sum + prop.units.length * 800, 0),
        netIncome: 0, // Will be calculated below
      },
    };

    // Calculate final totals
    taxData.summary.netIncome = taxData.summary.totalRentReceived - taxData.summary.totalExpenses - taxData.summary.totalDepreciation;

    // Mock TurboTax API integration
    // In production, you would use TurboTax API or generate downloadable tax forms
    console.log('Preparing TurboTax data:', JSON.stringify(taxData, null, 2));

    // Generate Schedule E data (simplified)
    const scheduleEData = generateScheduleEData(taxData);

    return NextResponse.json({ 
      success: true, 
      message: 'Tax data prepared successfully',
      taxYear,
      scheduleEData,
      downloadable: true,
    });
  } catch (error) {
    console.error('TurboTax sync error:', error);
    return NextResponse.json({ success: false, message: 'Tax preparation failed' }, { status: 500 });
  }
}

function generateScheduleEData(taxData: any) {
  return {
    form: 'Schedule E',
    description: 'Supplemental Income and Loss',
    properties: taxData.properties.map((prop: any) => ({
      address: prop.propertyName,
      rentReceived: prop.totalRentReceived,
      expenses: {
        advertising: 0,
        cleaning: 0,
        commissions: 0,
        insurance: prop.expenses.insurance,
        legal: 0,
        management: 0,
        mortgageInterest: 0,
        otherInterest: 0,
        repairs: prop.expenses.maintenance,
        supplies: 0,
        taxes: prop.expenses.propertyTax,
        utilities: prop.expenses.utilities,
        depreciation: prop.depreciation,
        other: prop.expenses.other,
      },
      netIncome: prop.netIncome,
    })),
    total: {
      rentReceived: taxData.summary.totalRentReceived,
      totalExpenses: taxData.summary.totalExpenses + taxData.summary.totalDepreciation,
      netIncome: taxData.summary.netIncome,
    },
  };
}
