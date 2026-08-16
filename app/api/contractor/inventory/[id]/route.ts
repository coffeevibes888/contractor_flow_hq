import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET - Get inventory item details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const item = await prisma.contractorInventoryItem.findUnique({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

// PUT - Update inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Verify item belongs to contractor
    const existingItem = await prisma.contractorInventoryItem.findUnique({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      sku,
      category,
      quantity,
      unit,
      unitCost,
      reorderPoint,
      location,
      vendorId,
      notes,
      qrCode,
    } = body;

    // Verify vendor if provided
    if (vendorId) {
      const vendor = await prisma.contractorVendor.findUnique({
        where: {
          id: vendorId,
          contractorId: contractorProfile.id,
        },
      });

      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }
    }

    const item = await prisma.contractorInventoryItem.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(sku !== undefined && { sku }),
        ...(category !== undefined && { category }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(unit && { unit }),
        ...(unitCost !== undefined && { unitCost: parseFloat(unitCost) }),
        ...(reorderPoint !== undefined && {
          reorderPoint: reorderPoint ? parseInt(reorderPoint) : null,
        }),
        ...(location !== undefined && { location }),
        ...(vendorId !== undefined && { vendorId }),
        ...(notes !== undefined && { notes }),
        ...(qrCode !== undefined && { qrCode }),
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Verify item belongs to contractor
    const existingItem = await prisma.contractorInventoryItem.findUnique({
      where: {
        id: params.id,
        contractorId: contractorProfile.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.contractorInventoryItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
