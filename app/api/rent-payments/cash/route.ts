import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    const body = await request.json();
    const { leaseId, amount, note } = body;

    if (!leaseId || !amount || amount <= 0) {
      return NextResponse.json({ message: 'Invalid payment data' }, { status: 400 });
    }

    // Verify the lease belongs to this landlord
    const lease = await prisma.lease.findFirst({
      where: {
        id: leaseId,
        unit: {
          property: {
            landlordId: landlordResult.landlord.id,
          },
        },
      },
      include: {
        tenant: { select: { id: true, name: true } },
        unit: {
          include: {
            property: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ message: 'Lease not found or access denied' }, { status: 404 });
    }

    // Find the oldest pending/overdue rent payment to mark as paid, or create a new one
    const pendingPayment = await prisma.rentPayment.findFirst({
      where: {
        leaseId,
        status: { in: ['pending', 'overdue'] },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();

    if (pendingPayment) {
      // Update existing payment to paid
      await prisma.rentPayment.update({
        where: { id: pendingPayment.id },
        data: {
          status: 'paid',
          paidAt: now,
          paymentMethod: 'cash',
          metadata: { note: note || 'Cash payment received' },
        },
      });
    } else {
      // Create a new rent payment record for the cash payment
      // tenantId is required, so we need to ensure we have it
      if (!lease.tenant?.id) {
        return NextResponse.json({ message: 'No tenant associated with this lease' }, { status: 400 });
      }

      await prisma.rentPayment.create({
        data: {
          leaseId,
          tenantId: lease.tenant.id,
          amount,
          dueDate: now,
          paidAt: now,
          status: 'paid',
          paymentMethod: 'cash',
          metadata: { note: note || 'Cash payment received' },
        },
      });
    }

    // Add the amount to the landlord's wallet
    await prisma.landlordWallet.upsert({
      where: { landlordId: landlordResult.landlord.id },
      create: {
        landlordId: landlordResult.landlord.id,
        availableBalance: amount,
        pendingBalance: 0,
      },
      update: {
        availableBalance: { increment: amount },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Cash payment recorded successfully',
    });
  } catch (error) {
    console.error('Error recording cash payment:', error);
    return NextResponse.json(
      { message: 'Failed to record cash payment' },
      { status: 500 }
    );
  }
}
