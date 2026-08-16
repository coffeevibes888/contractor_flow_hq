import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { ContractorInvoicingService } from '@/lib/services/contractor-invoicing';

// POST - Send invoice via email to the customer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Ownership check — make sure this invoice belongs to the caller before
    // we send it anywhere.
    const invoice = await prisma.contractorInvoice.findFirst({
      where: { id, contractorId: contractorProfile.id },
      select: { id: true, status: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Finalize the invoice before sending it.' },
        { status: 400 }
      );
    }

    // Actually send the email + flip status to "sent". The service throws
    // on email-provider failure, so a 200 here means the email really went
    // out (no more lying about it).
    const result = await ContractorInvoicingService.sendInvoice(id);

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to send invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
