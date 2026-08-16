import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ContractorInvoicingService } from '@/lib/services/contractor-invoicing';
import { prisma } from '@/db/prisma';

/**
 * GET /api/contractor/invoices/[id]/pdf
 * Generate and download invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor profile
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Verify invoice belongs to contractor
    const invoice = await prisma.contractorInvoice.findUnique({
      where: { id: params.id },
      select: { contractorId: true, invoiceNumber: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.contractorId !== contractor.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const pdfBuffer = await ContractorInvoicingService.generatePDF(params.id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
