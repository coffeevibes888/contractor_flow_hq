import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/contractor/purchase-orders - List all purchase orders
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');

    let query = `
      SELECT po.*, v.name as vendorName, j.title as jobTitle, j."jobNumber"
      FROM "ContractorPurchaseOrder" po
      LEFT JOIN "ContractorVendor" v ON po."vendorId" = v.id
      LEFT JOIN "ContractorJob" j ON po."jobId" = j.id
      WHERE po."contractorId" = '${contractorProfile.id}'
    `;

    if (status) {
      query += ` AND po.status = '${status}'`;
    }
    if (vendorId) {
      query += ` AND po."vendorId" = '${vendorId}'`;
    }

    query += ` ORDER BY po."orderDate" DESC`;

    const purchaseOrders = await prisma.$queryRawUnsafe(query);

    return NextResponse.json({ success: true, purchaseOrders: purchaseOrders || [] });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

// POST /api/contractor/purchase-orders - Create new purchase order
export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const data = await req.json();

    // Generate PO number
    const year = new Date().getFullYear();
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "ContractorPurchaseOrder" 
      WHERE "contractorId" = ${contractorProfile.id} 
      AND EXTRACT(YEAR FROM "orderDate") = ${year}
    `;
    const poNumber = `PO-${year}-${String((count as any)[0].count + 1).padStart(4, '0')}`;

    // Calculate totals
    const subtotal = data.lineItems.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0);
    const tax = data.tax || 0;
    const shipping = data.shipping || 0;
    const total = subtotal + tax + shipping;

    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "ContractorPurchaseOrder" (
        id, "contractorId", "poNumber", status, "vendorId", "jobId",
        subtotal, tax, shipping, total, currency, "orderDate", "requiredDate",
        "deliveryAddress", "deliveryCity", "deliveryState", "deliveryZip", 
        "deliveryInstructions", notes, "internalNotes", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${contractorProfile.id}, ${poNumber}, ${data.status || 'draft'}, 
        ${data.vendorId || null}, ${data.jobId || null},
        ${subtotal}, ${tax}, ${shipping}, ${total}, ${data.currency || 'USD'},
        ${new Date()}, ${data.requiredDate ? new Date(data.requiredDate) : null},
        ${data.deliveryAddress || null}, ${data.deliveryCity || null}, 
        ${data.deliveryState || null}, ${data.deliveryZip || null},
        ${data.deliveryInstructions || null}, ${data.notes || null}, 
        ${data.internalNotes || null}, ${new Date()}, ${new Date()}
      )
    `;

    // Insert line items
    for (const item of data.lineItems) {
      const itemId = crypto.randomUUID();
      const itemTotal = item.quantity * item.unitPrice;
      
      await prisma.$executeRaw`
        INSERT INTO "ContractorPurchaseOrderItem" (
          id, "poId", "itemName", sku, quantity, unit, "unitPrice", total,
          "quantityOrdered", "inventoryItemId", notes
        ) VALUES (
          ${itemId}, ${id}, ${item.name}, ${item.sku || null}, 
          ${item.quantity}, ${item.unit || 'each'}, ${item.unitPrice}, ${itemTotal},
          ${item.quantity}, ${item.inventoryItemId || null}, ${item.notes || null}
        )
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Purchase order created',
      id,
      poNumber
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 });
  }
}
