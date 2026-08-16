import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { onQuoteAccepted } from '@/lib/services/contractor-automation';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quoteId = params.id;

    // Get the quote
    const quote = await prisma.contractorQuote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Verify ownership
    if (quote.customerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already accepted/rejected
    if (quote.status !== 'pending') {
      return NextResponse.json(
        { error: 'Quote has already been responded to' },
        { status: 400 }
      );
    }

    // Update quote status
    const updatedQuote = await prisma.contractorQuote.update({
      where: { id: quoteId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Run the full automation pipeline:
    // Creates job, contract, sends signing link, notifies contractor, updates lead
    const { job, contract, signingUrl } = await onQuoteAccepted(quoteId);

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      jobId: job.id,
      contractId: contract.id,
      signingUrl,
    });
  } catch (error) {
    console.error('Error accepting quote:', error);
    return NextResponse.json(
      { error: 'Failed to accept quote' },
      { status: 500 }
    );
  }
}
