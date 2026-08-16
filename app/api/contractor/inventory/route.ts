import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      contractorId,
      name,
      sku,
      category,
      description,
      quantity,
      unit,
      unitCost,
      reorderPoint,
      location,
      vendorId,
      notes,
    } = body;

    // Verify contractor ownership
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId, userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Create inventory item
    const item = await prisma.contractorInventoryItem.create({
      data: {
        contractorId,
        name,
        sku: sku || null,
        category: category || null,
        description: description || null,
        quantity: Number(quantity),
        unit,
        unitCost: Number(unitCost),
        costPerUnit: Number(unitCost), // Keep both for compatibility
        reorderPoint: reorderPoint ? Number(reorderPoint) : null,
        reorderLevel: reorderPoint ? Number(reorderPoint) : null, // Keep both for compatibility
        location: location || null,
        vendorId: vendorId || null,
        notes: notes || null,
      },
    });

    // Update inventory count in usage tracking
    await prisma.contractorUsageTracking.upsert({
      where: { contractorId },
      create: {
        contractorId,
        inventoryCount: 1,
        activeJobsCount: 0,
        invoicesThisMonth: 0,
        totalCustomers: 0,
        teamMembersCount: 0,
        equipmentCount: 0,
        activeLeadsCount: 0,
      },
      update: {
        inventoryCount: { increment: 1 },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const items = await prisma.contractorInventoryItem.findMany({
      where: { contractorId: contractor.id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            contactName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
}
