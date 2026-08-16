import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// POST - Record payment for invoice
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { amount, method, notes, stripePaymentId } = body;

    if (!amount || !method) {
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      );
    }

    // Get invoice
    const invoice = await prisma.contractorInvoice.findFirst({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create payment record
    const payment = await prisma.contractorInvoicePayment.create({
      data: {
        invoiceId: params.id,
        amount: parseFloat(amount),
        method,
        notes: notes || null,
        stripePaymentId: stripePaymentId || null,
      },
    });

    // Update invoice amounts
    const newAmountPaid = Number(invoice.amountPaid) + parseFloat(amount);
    const newAmountDue = Number(invoice.total) - newAmountPaid;
    
    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    await prisma.contractorInvoice.update({
      where: { id: params.id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
