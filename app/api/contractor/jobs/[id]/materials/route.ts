/**
 * GET  /api/contractor/jobs/[id]/materials  — list materials for a job
 * POST /api/contractor/jobs/[id]/materials  — add a material to a job
 * DELETE /api/contractor/jobs/[id]/materials?materialId=xxx — remove a material
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

async function getProfile(userId: string) {
  return prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await getProfile(session.user.id);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;
    const materials = await db.contractorJobMaterial.findMany({
      where: { jobId: params.id, contractorId: profile.id },
      include: {
        item: {
          select: { id: true, name: true, sku: true, quantity: true, unit: true, category: true, unitCost: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ materials });
  } catch (error) {
    console.error('[GET job materials]', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await getProfile(session.user.id);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const db = prisma as any;

    // Verify job ownership
    const job = await db.contractorJob.findFirst({
      where: { id: params.id, contractorId: profile.id },
      select: { id: true },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const body = await req.json();
    const { itemId, quantityNeeded } = body as { itemId: string; quantityNeeded: number };

    if (!itemId || !quantityNeeded || quantityNeeded <= 0) {
      return NextResponse.json({ error: 'itemId and quantityNeeded (> 0) are required' }, { status: 400 });
    }

    // Verify inventory item belongs to contractor
    const invItem = await db.contractorInventoryItem.findFirst({
      where: { id: itemId, contractorId: profile.id },
      select: { id: true, name: true, unitCost: true, unit: true },
    });
    if (!invItem) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });

    // Upsert — if already linked, update quantity
    const material = await db.contractorJobMaterial.upsert({
      where: { jobId_itemId: { jobId: params.id, itemId } },
      create: {
        contractorId: profile.id,
        jobId: params.id,
        itemId,
        quantityNeeded,
        unitCostAtTime: invItem.unitCost ?? 0,
        totalCost: Number(invItem.unitCost ?? 0) * quantityNeeded,
        status: 'planned',
      },
      update: {
        quantityNeeded,
        totalCost: Number(invItem.unitCost ?? 0) * quantityNeeded,
      },
      include: {
        item: { select: { id: true, name: true, sku: true, quantity: true, unit: true } },
      },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error('[POST job materials]', error);
    return NextResponse.json({ error: 'Failed to add material' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await getProfile(session.user.id);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get('materialId');
    if (!materialId) return NextResponse.json({ error: 'materialId required' }, { status: 400 });

    const db = prisma as any;
    await db.contractorJobMaterial.deleteMany({
      where: { id: materialId, contractorId: profile.id, jobId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE job materials]', error);
    return NextResponse.json({ error: 'Failed to remove material' }, { status: 500 });
  }
}
