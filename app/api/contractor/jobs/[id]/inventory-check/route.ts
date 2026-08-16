/**
 * GET /api/contractor/jobs/[id]/inventory-check
 *
 * Checks whether the inventory items linked to a job (via ContractorJobMaterial)
 * have sufficient stock. Returns a list of items with their needed vs available
 * quantities so the UI can show a "Materials Ready" or "Shortages" panel.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(
  _req: NextRequest,
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

    // Verify job belongs to this contractor
    const job = await db.contractorJob.findFirst({
      where: { id: params.id, contractorId: profile.id },
      select: { id: true, title: true, jobNumber: true },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Fetch planned materials with current inventory levels
    const materials = await db.contractorJobMaterial.findMany({
      where: { jobId: params.id, contractorId: profile.id },
      select: {
        id: true,
        quantityNeeded: true,
        quantityReserved: true,
        quantityLoaded: true,
        status: true,
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unit: true,
            category: true,
            reorderPoint: true,
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    });

    const results = materials.map((mat: any) => {
      const inStock = Number(mat.item.quantity);
      const needed = mat.quantityNeeded;
      const shortage = Math.max(0, needed - inStock);
      return {
        materialId: mat.id,
        itemId: mat.item.id,
        name: mat.item.name,
        sku: mat.item.sku,
        category: mat.item.category,
        unit: mat.item.unit,
        quantityNeeded: needed,
        quantityInStock: inStock,
        quantityReserved: mat.quantityReserved,
        quantityLoaded: mat.quantityLoaded,
        shortage,
        status: mat.status,
        isReady: shortage === 0,
        vendor: mat.item.vendor ?? null,
      };
    });

    const shortages = results.filter((r: any) => r.shortage > 0);
    const allReady = shortages.length === 0;

    return NextResponse.json({
      jobId: params.id,
      jobNumber: job.jobNumber,
      totalMaterials: results.length,
      shortageCount: shortages.length,
      allReady,
      materials: results,
    });
  } catch (error) {
    console.error('[inventory-check]', error);
    return NextResponse.json({ error: 'Failed to check inventory' }, { status: 500 });
  }
}
