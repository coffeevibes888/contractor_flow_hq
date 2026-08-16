import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

/**
 * Get payment summary for landlord dashboard
 * Shows total received, monthly stats, and recent payments
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const landlordId = landlordResult.landlord.id;

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all paid payments for this landlord's properties
    const allPaidPayments = await prisma.rentPayment.findMany({
      where: {
        status: 'paid',
        lease: {
          unit: {
            property: {
              landlordId,
            },
          },
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    });

    // Calculate totals
    const totalReceived = allPaidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    
    const thisMonth = allPaidPayments
      .filter(p => p.paidAt && p.paidAt >= startOfMonth)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    const lastMonth = allPaidPayments
      .filter(p => p.paidAt && p.paidAt >= startOfLastMonth && p.paidAt <= endOfLastMonth)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Get pending payments
    const pendingPayments = await prisma.rentPayment.aggregate({
      where: {
        status: 'pending',
        lease: {
          unit: {
            property: {
              landlordId,
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get recent payments with details
    const recentPayments = await prisma.rentPayment.findMany({
      where: {
        status: 'paid',
        lease: {
          unit: {
            property: {
              landlordId,
            },
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
      take: 10,
      include: {
        tenant: {
          select: { name: true },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      summary: {
        totalReceived,
        thisMonth,
        lastMonth,
        pendingPayments: Number(pendingPayments._sum.amount) || 0,
      },
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        tenantName: p.tenant.name,
        propertyName: p.lease.unit.property.name,
        unitName: p.lease.unit.name,
        paidAt: p.paidAt?.toISOString(),
        status: p.status,
        metadata: p.metadata as Record<string, unknown> | null,
        dueDate: p.dueDate?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error getting payment summary:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}
