import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

// POST - Submit a bid on an open work order
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: workOrderId } = await params;
    const body = await req.json();
    const {
      amount,
      laborCost,
      materialsCost,
      estimatedHours,
      proposedStartDate,
      estimatedCompletionDate,
      inclusions,
      exclusions,
      warrantyDays,
      willPullPermits,
      paymentTerms,
      validUntil,
      message,
    } = body;

    const toNum = (v: unknown) =>
      v === '' || v === null || v === undefined ? null : Number(v);
    const toDate = (v: unknown) =>
      v === '' || v === null || v === undefined ? null : new Date(v as string);
    const toStrArr = (v: unknown): string[] =>
      Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid bid amount is required' },
        { status: 400 }
      );
    }

    // Verify work order exists and is open for bids — we need landlordId
    // before resolving the contractor record (Contractor is per-landlord).
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }

    if (!workOrder.isOpenBid || workOrder.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'This job is not open for bidding' },
        { status: 400 }
      );
    }

    if (workOrder.bidDeadline && new Date(workOrder.bidDeadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Bidding deadline has passed' },
        { status: 400 }
      );
    }

    // Resolve the Contractor directory record for this user + this landlord.
    // If the user signed up via the marketplace they only have a
    // ContractorProfile; auto-create a Contractor entry in the landlord's
    // directory using the profile data so the bid FK is satisfied.
    let contractorId: string | null = null;

    const existingContractor = await prisma.contractor.findFirst({
      where: {
        userId: session.user.id,
        landlordId: workOrder.landlordId,
      },
      select: { id: true },
    });

    if (existingContractor) {
      contractorId = existingContractor.id;
    } else {
      const contractorProfile = await prisma.contractorProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          businessName: true,
          displayName: true,
          email: true,
          phone: true,
          specialties: true,
        },
      });

      if (!contractorProfile) {
        return NextResponse.json(
          { success: false, error: 'You must have a contractor profile to submit bids' },
          { status: 403 }
        );
      }

      // Avoid hitting the @@unique([landlordId, email]) constraint if the
      // landlord already has a directory entry with this email but no userId.
      const existingByEmail = await prisma.contractor.findUnique({
        where: {
          landlordId_email: {
            landlordId: workOrder.landlordId,
            email: contractorProfile.email,
          },
        },
        select: { id: true, userId: true },
      });

      if (existingByEmail) {
        if (!existingByEmail.userId) {
          await prisma.contractor.update({
            where: { id: existingByEmail.id },
            data: { userId: session.user.id },
          });
        }
        contractorId = existingByEmail.id;
      } else {
        const created = await prisma.contractor.create({
          data: {
            landlordId: workOrder.landlordId,
            userId: session.user.id,
            name: contractorProfile.displayName || contractorProfile.businessName,
            email: contractorProfile.email,
            phone: contractorProfile.phone,
            specialties: contractorProfile.specialties,
            businessName: contractorProfile.businessName,
          },
          select: { id: true },
        });
        contractorId = created.id;
      }
    }

    // Check if contractor already submitted a bid
    const existingBid = await prisma.workOrderBid.findUnique({
      where: {
        workOrderId_contractorId: {
          workOrderId,
          contractorId,
        },
      },
    });

    if (existingBid) {
      // Update existing bid
      const updatedBid = await prisma.workOrderBid.update({
        where: { id: existingBid.id },
        data: {
          amount: parseFloat(amount),
          laborCost: toNum(laborCost),
          materialsCost: toNum(materialsCost),
          estimatedHours: toNum(estimatedHours),
          proposedStartDate: toDate(proposedStartDate),
          estimatedCompletionDate: toDate(estimatedCompletionDate),
          inclusions: toStrArr(inclusions),
          exclusions: toStrArr(exclusions),
          warrantyDays: toNum(warrantyDays) === null ? null : Math.round(Number(warrantyDays)),
          willPullPermits: typeof willPullPermits === 'boolean' ? willPullPermits : null,
          paymentTerms: paymentTerms || null,
          validUntil: toDate(validUntil),
          message: message || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Bid updated successfully',
        bid: updatedBid,
      });
    }

    // Create new bid
    const bid = await prisma.workOrderBid.create({
      data: {
        workOrderId,
        contractorId,
        amount: parseFloat(amount),
        laborCost: toNum(laborCost),
        materialsCost: toNum(materialsCost),
        estimatedHours: toNum(estimatedHours),
        proposedStartDate: toDate(proposedStartDate),
        estimatedCompletionDate: toDate(estimatedCompletionDate),
        inclusions: toStrArr(inclusions),
        exclusions: toStrArr(exclusions),
        warrantyDays: toNum(warrantyDays) === null ? null : Math.round(Number(warrantyDays)),
        willPullPermits: typeof willPullPermits === 'boolean' ? willPullPermits : null,
        paymentTerms: paymentTerms || null,
        validUntil: toDate(validUntil),
        message: message || null,
        status: 'pending',
      },
    });

    // ✅ NEW: Emit event for bid received (notifies work order owner)
    try {
      const { dbTriggers } = await import('@/lib/event-system');
      const workOrder = await prisma.workOrder.findUnique({ 
        where: { id: workOrderId },
        include: { landlord: true }
      });
      if (workOrder) {
        await dbTriggers.onWorkOrderBidCreate(bid, workOrder);
      }
    } catch (error) {
      console.error('Failed to emit bid event:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Bid submitted successfully',
      bid,
    });
  } catch (error) {
    console.error('Error submitting bid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit bid' },
      { status: 500 }
    );
  }
}

// GET - Get bids for a work order (for landlords) or contractor's bid
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: workOrderId } = await params;

    // Check if user is a contractor
    const contractorProfile = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const legacyContractor = !contractorProfile
      ? await prisma.contractor.findFirst({
          where: { userId: session.user.id },
          select: { id: true },
        })
      : null;

    const bidContractorId = contractorProfile?.id || legacyContractor?.id;

    if (bidContractorId) {
      // Return contractor's own bid
      const bid = await prisma.workOrderBid.findUnique({
        where: {
          workOrderId_contractorId: {
            workOrderId,
            contractorId: bidContractorId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        myBid: bid,
      });
    }

    // Check if user is the landlord who owns this work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        landlord: { select: { ownerUserId: true } },
        bids: {
          include: {
            contractor: {
              select: {
                id: true,
                name: true,
                email: true,
                specialties: true,
                isPaymentReady: true,
                user: {
                  select: { image: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { success: false, error: 'Work order not found' },
        { status: 404 }
      );
    }

    if (workOrder.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view bids' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      bids: workOrder.bids.map((b) => ({
        id: b.id,
        amount: b.amount.toString(),
        estimatedHours: b.estimatedHours?.toString() || null,
        proposedStartDate: b.proposedStartDate,
        message: b.message,
        status: b.status,
        createdAt: b.createdAt,
        contractor: {
          id: b.contractor.id,
          name: b.contractor.name,
          email: b.contractor.email,
          specialties: b.contractor.specialties,
          isPaymentReady: b.contractor.isPaymentReady,
          image: b.contractor.user?.image,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}
