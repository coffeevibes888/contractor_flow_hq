import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * POST /api/contractor/inventory/scan
 * 
 * Look up inventory item by barcode/SKU
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contractor = await prisma.contractorProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json(
        { success: false, message: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    const { barcode } = await req.json();

    if (!barcode) {
      return NextResponse.json(
        { success: false, message: 'Barcode is required' },
        { status: 400 }
      );
    }

    // Search by barcode or SKU
    const item = await prisma.contractorInventoryItem.findFirst({
      where: {
        contractorId: contractor.id,
        OR: [
          { barcode: barcode },
          { sku: barcode },
        ],
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'Item not found', barcode },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        location: item.location,
        unitCost: item.unitCost,
        vendor: item.vendor,
      },
    });
  } catch (error) {
    console.error('Barcode scan error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to scan barcode' },
      { status: 500 }
    );
  }
}
