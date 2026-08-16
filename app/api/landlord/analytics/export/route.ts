import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    const format = searchParams.get('format') as 'csv' | 'excel';

    if (!landlordId || !format) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
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

    // Get data for export
    const properties = await prisma.property.findMany({
      where: { landlordId },
      include: {
        units: {
          include: {
            leases: {
              include: {
                tenant: true,
                rentPayments: {
                  where: { status: 'paid' },
                  orderBy: { paidAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    // Generate CSV data
    const csvHeaders = [
      'Property Name',
      'Unit Name',
      'Tenant Name',
      'Rent Amount',
      'Status',
      'Last Payment Date',
      'Last Payment Amount',
      'Total Paid',
    ];

    const csvRows = properties.flatMap(property =>
      property.units.map(unit => {
        const lease = unit.leases[0]; // Get active lease
        const tenant = lease?.tenant;
        const totalPaid = lease?.rentPayments.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
        const lastPayment = lease?.rentPayments[0];

        return [
          property.name,
          unit.name,
          tenant?.name || 'Vacant',
          lease ? `$${Number(lease.rentAmount).toFixed(2)}` : '$0',
          lease ? 'Active' : 'Vacant',
          lastPayment?.paidAt?.toISOString().split('T')[0] || '',
          lastPayment ? `$${Number(lastPayment.amount).toFixed(2)}` : '$0',
          `$${totalPaid.toFixed(2)}`,
        ];
      })
    );

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    if (format === 'csv') {
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="financial-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // For Excel, we'll return CSV for now (you can add a library like xlsx later)
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="financial-report-${new Date().toISOString().split('T')[0]}.xls"`,
      },
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
