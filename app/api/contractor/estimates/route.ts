import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';

// GET - Fetch contractor's estimates
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const templatesOnly = searchParams.get('templates') === 'true';

    // Get contractor profiles for this user
    const contractors = await prisma.contractor.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (contractors.length === 0) {
      return NextResponse.json({ estimates: [], templates: [] });
    }

    const contractorIds = contractors.map(c => c.id);

    const estimates = await prisma.contractorEstimate.findMany({
      where: {
        contractorId: { in: contractorIds },
        isTemplate: templatesOnly,
      },
      include: {
        landlord: { select: { id: true, name: true, companyName: true } },
        workOrder: { select: { id: true, title: true, property: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ estimates });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
}

// POST - Create new estimate or template
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      lineItems = [],
      laborCost = 0,
      materialsCost = 0,
      estimatedHours,
      validUntil,
      isTemplate = false,
      templateName,
      attachmentUrl,
      landlordId,
      workOrderId,
    } = body;

    // Get contractor profile
    const contractor = await prisma.contractor.findFirst({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Calculate total
    const lineItemsTotal = lineItems.reduce((sum: number, item: any) => 
      sum + (Number(item.qty) * Number(item.unitPrice)), 0);
    const totalAmount = lineItemsTotal + Number(laborCost) + Number(materialsCost);

    const estimate = await prisma.contractorEstimate.create({
      data: {
        contractorId: contractor.id,
        landlordId: landlordId || null,
        workOrderId: workOrderId || null,
        title,
        description,
        lineItems,
        laborCost,
        materialsCost,
        totalAmount,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isTemplate,
        templateName: isTemplate ? templateName : null,
        attachmentUrl,
        status: isTemplate ? 'draft' : 'draft',
      },
    });

    // Templates don't fire estimate.created — only real estimates do.
    if (!isTemplate) {
      await eventBus.emit('contractor.estimate.created', {
        estimateId: estimate.id,
        contractorId: contractor.id,
        contractorUserId: session.user.id,
        title: estimate.title,
        totalAmount: Number(estimate.totalAmount),
        landlordId: estimate.landlordId,
        workOrderId: estimate.workOrderId,
      });
    }

    return NextResponse.json({ estimate });
  } catch (error) {
    console.error('Error creating estimate:', error);
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
  }
}
