import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, paymentMethod } = await req.json();
    const jobId = params.id;

    // Get the escrow
    const escrow = await prisma.jobEscrow.findUnique({
      where: { contractorJobId: jobId },
      include: {
        contractorJob: {
          include: {
            contractor: {
              select: {
                id: true,
                businessName: true,
                displayName: true,
                userId: true
              }
            },
            customer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!escrow) {
      return NextResponse.json(
        { error: 'Escrow not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (escrow.contractorJob.customerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if already funded
    if (escrow.status === 'funded') {
      return NextResponse.json(
        { error: 'Escrow already funded' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount !== Number(escrow.totalAmount)) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // TODO: Integrate with Stripe
    // For now, we'll simulate a successful payment
    const mockPaymentIntentId = `pi_mock_${Date.now()}`;

    // Update escrow status
    const updatedEscrow = await prisma.jobEscrow.update({
      where: { id: escrow.id },
      data: {
        status: 'funded',
        stripePaymentId: mockPaymentIntentId,
        fundedAt: new Date()
      }
    });

    // Update job status
    await prisma.contractorJob.update({
      where: { id: jobId },
      data: {
        status: 'in_progress'
      }
    });

    // Send notification to contractor
    try {
      await prisma.notification.create({
        data: {
          userId: escrow.contractorJob.contractor.userId,
          type: 'escrow_funded',
          title: 'Escrow Funded - Job Ready to Start',
          message: `${escrow.contractorJob.customer?.name ?? 'A customer'} has funded the escrow for "${escrow.contractorJob.title}". You can now begin work!`,
          actionUrl: `/contractor/jobs/${jobId}`
        }
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: mockPaymentIntentId,
      escrow: {
        id: updatedEscrow.id,
        status: updatedEscrow.status,
        fundedAt: updatedEscrow.fundedAt
      }
    });
  } catch (error) {
    console.error('Error funding escrow:', error);
    return NextResponse.json(
      { error: 'Failed to fund escrow' },
      { status: 500 }
    );
  }
}
