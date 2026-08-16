import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * POST /api/contractor/inventory/bulk
 * 
 * Perform bulk operations on inventory items
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

    const { action, itemIds, data } = await req.json();

    if (!action || !itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'updateLocation':
        if (!data?.location) {
          return NextResponse.json(
            { success: false, message: 'Location is required' },
            { status: 400 }
          );
        }
        result = await prisma.contractorInventoryItem.updateMany({
          where: {
            id: { in: itemIds },
            contractorId: contractor.id,
          },
          data: {
            location: data.location,
          },
        });
        break;

      case 'updateCategory':
        if (!data?.category) {
          return NextResponse.json(
            { success: false, message: 'Category is required' },
            { status: 400 }
          );
        }
        result = await prisma.contractorInventoryItem.updateMany({
          where: {
            id: { in: itemIds },
            contractorId: contractor.id,
          },
          data: {
            category: data.category,
          },
        });
        break;

      case 'delete':
        result = await prisma.contractorInventoryItem.deleteMany({
          where: {
            id: { in: itemIds },
            contractorId: contractor.id,
          },
        });
        break;

      case 'generateBarcodes':
        // Generate barcodes for items that don't have them
        const items = await prisma.contractorInventoryItem.findMany({
          where: {
            id: { in: itemIds },
            contractorId: contractor.id,
            barcode: null,
          },
        });

        const updates = items.map((item) => {
          // Generate barcode from SKU or ID
          const barcode = item.sku || `INV${item.id.slice(-8).toUpperCase()}`;
          return prisma.contractorInventoryItem.update({
            where: { id: item.id },
            data: { barcode },
          });
        });

        await Promise.all(updates);
        result = { count: updates.length };
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}d ${result.count} item(s)`,
      count: result.count,
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
