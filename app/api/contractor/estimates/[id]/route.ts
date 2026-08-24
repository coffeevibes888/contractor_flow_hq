import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

/**
 * Helper: Verify the current user owns this estimate via either
 * ContractorProfile or PM-side Contractor.
 */
async function verifyOwnership(userId: string, estimate: any): Promise<boolean> {
  // Check ContractorProfile ownership
  if (estimate.contractorProfileId) {
    const profile = await prisma.contractorProfile.findUnique({
      where: { id: estimate.contractorProfileId },
      select: { userId: true },
    });
    if (profile?.userId === userId) return true;
  }
  // Check PM-side Contractor ownership
  if (estimate.contractorId) {
    const contractor = await prisma.contractor.findUnique({
      where: { id: estimate.contractorId },
      select: { userId: true },
    });
    if (contractor?.userId === userId) return true;
  }
  return false;
}

// GET - Fetch single estimate
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const estimate = await prisma.contractorEstimate.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, address: true } },
        contractorProfile: { select: { id: true, businessName: true, displayName: true, email: true, phone: true, logoUrl: true } },
        landlord: { select: { id: true, name: true, companyName: true, companyEmail: true } },
        workOrder: {
          select: {
            id: true,
            title: true,
            description: true,
            property: { select: { name: true, address: true } },
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const isOwner = await verifyOwnership(session.user.id, estimate);
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ estimate });
  } catch (error) {
    console.error('Error fetching estimate:', error);
    return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 });
  }
}

// PUT - Update estimate
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.contractorEstimate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const isOwner = await verifyOwnership(session.user.id, existing);
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const {
      title,
      description,
      trade,
      category,
      customerId,
      lineItems,
      laborCost,
      materialsCost,
      markup,
      discount,
      taxRate,
      estimatedHours,
      validUntil,
      tiers,
      measurements,
      notes,
      customerNotes,
      termsConditions,
      photos,
      templateName,
      attachmentUrl,
    } = body;

    // Recalculate total if pricing fields changed
    const finalLineItems = lineItems ?? existing.lineItems;
    const finalLaborCost = laborCost ?? Number(existing.laborCost);
    const finalMaterialsCost = materialsCost ?? Number(existing.materialsCost);
    const finalMarkup = markup ?? Number(existing.markup);
    const finalDiscount = discount ?? Number(existing.discount);
    const finalTaxRate = taxRate ?? Number(existing.taxRate);

    const lineItemsTotal = (finalLineItems as any[]).reduce(
      (sum: number, item: any) => sum + (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
      0
    );
    const subtotal = lineItemsTotal + Number(finalLaborCost) + Number(finalMaterialsCost);
    const markupAmount = subtotal * (Number(finalMarkup) / 100);
    const afterMarkup = subtotal + markupAmount;
    const afterDiscount = afterMarkup - Number(finalDiscount);
    const taxAmount = afterDiscount * (Number(finalTaxRate) / 100);
    const totalAmount = afterDiscount + taxAmount;

    const estimate = await prisma.contractorEstimate.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        trade: trade !== undefined ? trade : existing.trade,
        category: category !== undefined ? category : existing.category,
        customerId: customerId !== undefined ? customerId : existing.customerId,
        lineItems: lineItems ?? existing.lineItems,
        laborCost: Number(finalLaborCost),
        materialsCost: Number(finalMaterialsCost),
        markup: Number(finalMarkup),
        discount: Number(finalDiscount),
        taxRate: Number(finalTaxRate),
        totalAmount,
        tiers: tiers !== undefined ? tiers : existing.tiers,
        measurements: measurements !== undefined ? measurements : existing.measurements,
        estimatedHours: estimatedHours !== undefined ? (estimatedHours ? Number(estimatedHours) : null) : existing.estimatedHours,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : existing.validUntil,
        notes: notes !== undefined ? notes : existing.notes,
        customerNotes: customerNotes !== undefined ? customerNotes : existing.customerNotes,
        termsConditions: termsConditions !== undefined ? termsConditions : existing.termsConditions,
        photos: photos !== undefined ? photos : existing.photos,
        templateName: templateName !== undefined ? templateName : existing.templateName,
        attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : existing.attachmentUrl,
      },
    });

    if (!estimate.isTemplate) {
      await eventBus.emit('contractor.estimate.updated', {
        estimateId: estimate.id,
        contractorId: estimate.contractorId,
        contractorProfileId: estimate.contractorProfileId,
        contractorUserId: session.user.id,
        title: estimate.title,
        totalAmount: Number(estimate.totalAmount),
      });
    }

    return NextResponse.json({ estimate });
  } catch (error) {
    console.error('Error updating estimate:', error);
    return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 });
  }
}

// DELETE - Delete estimate
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.contractorEstimate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const isOwner = await verifyOwnership(session.user.id, existing);
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.contractorEstimate.delete({ where: { id } });

    if (!existing.isTemplate) {
      await eventBus.emit('contractor.estimate.deleted', {
        estimateId: id,
        contractorId: existing.contractorId,
        contractorProfileId: existing.contractorProfileId,
        contractorUserId: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    return NextResponse.json({ error: 'Failed to delete estimate' }, { status: 500 });
  }
}
