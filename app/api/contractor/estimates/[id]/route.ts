import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

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
        contractor: { select: { id: true, name: true, userId: true } },
        landlord: { select: { id: true, name: true, companyName: true, companyEmail: true } },
        workOrder: { 
          select: { 
            id: true, 
            title: true, 
            description: true,
            property: { select: { name: true, address: true } } 
          } 
        },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Verify ownership
    if (estimate.contractor.userId !== session.user.id) {
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

    // Verify ownership
    const existing = await prisma.contractorEstimate.findUnique({
      where: { id },
      include: { contractor: { select: { userId: true } } },
    });

    if (!existing || existing.contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const {
      title,
      description,
      lineItems,
      laborCost,
      materialsCost,
      estimatedHours,
      validUntil,
      templateName,
      attachmentUrl,
    } = body;

    // Recalculate total if line items changed
    let totalAmount = existing.totalAmount;
    if (lineItems || laborCost !== undefined || materialsCost !== undefined) {
      const items = lineItems || existing.lineItems;
      const labor = laborCost ?? Number(existing.laborCost);
      const materials = materialsCost ?? Number(existing.materialsCost);
      const lineItemsTotal = (items as any[]).reduce((sum: number, item: any) => 
        sum + (Number(item.qty) * Number(item.unitPrice)), 0);
      totalAmount = lineItemsTotal + labor + materials;
    }

    const estimate = await prisma.contractorEstimate.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        lineItems: lineItems ?? existing.lineItems,
        laborCost: laborCost ?? existing.laborCost,
        materialsCost: materialsCost ?? existing.materialsCost,
        totalAmount,
        estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : existing.estimatedHours,
        validUntil: validUntil ? new Date(validUntil) : existing.validUntil,
        templateName: templateName ?? existing.templateName,
        attachmentUrl: attachmentUrl ?? existing.attachmentUrl,
      },
    });

    if (!estimate.isTemplate) {
      await eventBus.emit('contractor.estimate.updated', {
        estimateId: estimate.id,
        contractorId: estimate.contractorId,
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

    // Verify ownership
    const existing = await prisma.contractorEstimate.findUnique({
      where: { id },
      include: { contractor: { select: { userId: true } } },
    });

    if (!existing || existing.contractor.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.contractorEstimate.delete({ where: { id } });

    if (!existing.isTemplate) {
      await eventBus.emit('contractor.estimate.deleted', {
        estimateId: id,
        contractorId: existing.contractorId,
        contractorUserId: session.user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    return NextResponse.json({ error: 'Failed to delete estimate' }, { status: 500 });
  }
}
