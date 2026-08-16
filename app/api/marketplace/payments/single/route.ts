/**
 * POST /api/marketplace/payments/single
 *
 * Landlord clicks "Pay" on an instant-book or direct-hire job. We
 * delegate to executeSinglePayment(). No money moved before this point.
 *
 * Body:
 *   { workOrderId: string, amountCents: number }
 *   OR
 *   { contractorJobId: string, amountCents: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { executeSinglePayment } from '@/lib/services/treasury-payments.service';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      workOrderId?: string;
      contractorJobId?: string;
      amountCents?: number;
      description?: string;
    };

    const amountCents = Math.round(Number(body.amountCents || 0));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero.' },
        { status: 400 }
      );
    }
    if (!body.workOrderId && !body.contractorJobId) {
      return NextResponse.json(
        { error: 'Provide a workOrderId or contractorJobId.' },
        { status: 400 }
      );
    }

    // Resolve sender + recipient based on which job entity was provided.
    let landlordId: string | null = null;
    let contractorId: string | undefined;
    let contractorProfileId: string | undefined;
    let jobId: string | undefined;
    let jobKind: 'work_order' | 'contractor_job' | undefined;

    if (body.workOrderId) {
      const wo = await prisma.workOrder.findUnique({
        where: { id: body.workOrderId },
        select: {
          id: true,
          landlordId: true,
          contractorId: true,
          landlord: { select: { ownerUserId: true } },
        },
      });
      if (!wo) {
        return NextResponse.json(
          { error: 'Work order not found.' },
          { status: 404 }
        );
      }
      if (wo.landlord.ownerUserId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the property manager can pay on this job.' },
          { status: 403 }
        );
      }
      landlordId = wo.landlordId;
      contractorId = wo.contractorId ?? undefined;
      jobId = wo.id;
      jobKind = 'work_order';
    } else if (body.contractorJobId) {
      const job = await prisma.contractorJob.findUnique({
        where: { id: body.contractorJobId },
        select: {
          id: true,
          customerId: true,
          contractorId: true,
        },
      });
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found.' },
          { status: 404 }
        );
      }
      if (job.customerId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the customer can pay on this job.' },
          { status: 403 }
        );
      }
      // ContractorJob -> ContractorProfile id directly.
      contractorProfileId = job.contractorId;
      // For homeowner-initiated jobs there is no Landlord row tied to the
      // payer. Fall back to the customer's first owned Landlord to satisfy
      // the wallet lookup path. (Homeowners using marketplace are expected
      // to also have a Landlord row from sign-up.)
      const landlord = await prisma.landlord.findFirst({
        where: { ownerUserId: session.user.id },
        select: { id: true },
      });
      if (!landlord) {
        return NextResponse.json(
          {
            error:
              'Set up your wallet (verify identity) before sending payments.',
          },
          { status: 400 }
        );
      }
      landlordId = landlord.id;
      jobId = job.id;
      jobKind = 'contractor_job';
    }

    const result = await executeSinglePayment({
      amountCents,
      landlordId: landlordId!,
      contractorId,
      contractorProfileId,
      description: body.description,
      jobId,
      jobKind,
      callerUserId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, reason: result.reason },
        { status: 400 }
      );
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[marketplace/payments/single] failed', err);
    return NextResponse.json(
      { error: err?.message || 'Could not process payment.' },
      { status: 500 }
    );
  }
}
