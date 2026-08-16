/**
 * POST /api/contractor/jobs/[id]/create-po-from-shortages
 *
 * Reads all ContractorJobMaterial records for a job where stock is insufficient,
 * groups them by vendor, and creates one draft PurchaseOrder per vendor
 * (or one combined PO if items have no vendor).
 *
 * Returns the created PO ids so the UI can redirect to the first one.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    // Verify job ownership
    const job = await db.contractorJob.findFirst({
      where: { id: params.id, contractorId: profile.id },
      select: {
        id: true, title: true, jobNumber: true,
        address: true, city: true, state: true, zipCode: true,
      },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Fetch all planned materials with inventory + vendor info
    const materials = await db.contractorJobMaterial.findMany({
      where: { jobId: params.id, contractorId: profile.id },
      select: {
        id: true,
        quantityNeeded: true,
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            unitCost: true,
            quantity: true,
            vendorId: true,
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Filter to only items that are short
    const shortages = materials.filter((m: any) => {
      const inStock = Number(m.item.quantity);
      return inStock < m.quantityNeeded;
    });

    if (shortages.length === 0) {
      return NextResponse.json({ message: 'No shortages found — all materials are in stock', poIds: [] });
    }

    // Group by vendorId (null = no vendor)
    const byVendor = new Map<string | null, typeof shortages>();
    for (const s of shortages) {
      const vid = s.item.vendorId ?? null;
      if (!byVendor.has(vid)) byVendor.set(vid, []);
      byVendor.get(vid)!.push(s);
    }

    const year = new Date().getFullYear();
    const poIds: string[] = [];
    const poNumbers: string[] = [];

    for (const [vendorId, items] of byVendor) {
      // Generate PO number
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "ContractorPurchaseOrder"
        WHERE "contractorId" = ${profile.id}
        AND EXTRACT(YEAR FROM "orderDate") = ${year}
      `;
      const nextNum = Number(countResult[0].count) + 1 + poIds.length;
      const poNumber = `PO-${year}-${String(nextNum).padStart(4, '0')}`;

      // Build line items
      const lineItems = items.map((s: any) => {
        const inStock = Number(s.item.quantity);
        const shortage = s.quantityNeeded - inStock;
        const unitPrice = Number(s.item.unitCost ?? 0);
        return {
          name: s.item.name,
          sku: s.item.sku,
          quantity: shortage,
          unit: s.item.unit ?? 'each',
          unitPrice,
          total: shortage * unitPrice,
          inventoryItemId: s.item.id,
        };
      });

      const subtotal = lineItems.reduce((sum: number, li: any) => sum + li.total, 0);

      const poId = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO "ContractorPurchaseOrder" (
          id, "contractorId", "poNumber", status, "vendorId", "jobId",
          subtotal, tax, shipping, total, currency, "orderDate",
          "deliveryAddress", "deliveryCity", "deliveryState", "deliveryZip",
          notes, "createdAt", "updatedAt"
        ) VALUES (
          ${poId}, ${profile.id}, ${poNumber}, 'draft',
          ${vendorId}, ${job.id},
          ${subtotal}, ${0}, ${0}, ${subtotal}, 'USD', ${new Date()},
          ${job.address ?? null}, ${job.city ?? null},
          ${job.state ?? null}, ${job.zipCode ?? null},
          ${`Auto-generated from job ${job.jobNumber} shortage check`},
          ${new Date()}, ${new Date()}
        )
      `;

      for (const li of lineItems) {
        const liId = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO "ContractorPurchaseOrderItem" (
            id, "poId", "itemName", sku, quantity, unit, "unitPrice", total,
            "quantityOrdered", "inventoryItemId"
          ) VALUES (
            ${liId}, ${poId}, ${li.name}, ${li.sku ?? null},
            ${li.quantity}, ${li.unit}, ${li.unitPrice}, ${li.total},
            ${li.quantity}, ${li.inventoryItemId ?? null}
          )
        `;
      }

      poIds.push(poId);
      poNumbers.push(poNumber);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${poIds.length} purchase order${poIds.length !== 1 ? 's' : ''}: ${poNumbers.join(', ')}`,
      poIds,
      poNumbers,
      firstPoId: poIds[0] ?? null,
    }, { status: 201 });
  } catch (error) {
    console.error('[create-po-from-shortages]', error);
    return NextResponse.json({ error: 'Failed to create purchase orders' }, { status: 500 });
  }
}
