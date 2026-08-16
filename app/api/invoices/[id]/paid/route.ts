import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ message: landlordResult.message }, { status: 403 });
    }

    const invoice = await prisma.tenantInvoice.findFirst({
      where: {
        id: invoiceId,
        property: {
          landlordId: landlordResult.landlord.id,
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found or access denied' }, { status: 404 });
    }

    await prisma.tenantInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'manual',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking invoice paid:', error);
    return NextResponse.json({ message: 'Failed to update invoice' }, { status: 500 });
  }
}
