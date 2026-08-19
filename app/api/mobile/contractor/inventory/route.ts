import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    try {
      const db = prisma as any;
      if (!db.contractorInventoryItem) return NextResponse.json({ items: [] });

      const where: any = { contractorId: contractorProfile.id };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      const items = await db.contractorInventoryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        take: 100,
      });

      return NextResponse.json({
        items: items.map((i: any) => ({
          id: i.id,
          name: i.name,
          sku: i.sku || null,
          quantity: i.quantity || 0,
          unitCost: i.unitCost ? Number(i.unitCost) : null,
          location: i.location || null,
          reorderPoint: i.reorderPoint || 5,
          category: i.category || null,
        })),
      });
    } catch {
      return NextResponse.json({ items: [] });
    }
  } catch (error) {
    console.error('[mobile/contractor/inventory GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!contractorProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body = await req.json();
    const { name, sku, quantity, unitCost, location, category, reorderPoint } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    try {
      const db = prisma as any;
      if (!db.contractorInventoryItem) {
        return NextResponse.json({ error: 'Inventory feature not available' }, { status: 501 });
      }

      const item = await db.contractorInventoryItem.create({
        data: {
          contractorId: contractorProfile.id,
          name,
          sku: sku || null,
          quantity: quantity || 0,
          unitCost: unitCost || null,
          location: location || null,
          category: category || null,
          reorderPoint: reorderPoint || 5,
        },
      });

      return NextResponse.json({ success: true, id: item.id });
    } catch {
      return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
    }
  } catch (error) {
    console.error('[mobile/contractor/inventory POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
