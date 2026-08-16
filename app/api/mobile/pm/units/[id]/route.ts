/**
 * PATCH /api/mobile/pm/units/:id
 *
 * Quick-edit a single unit from the mobile property detail screen.
 * Editable fields: name, bedrooms, bathrooms, sizeSqFt, rentAmount,
 * isAvailable, amenities, images.
 *
 * Ownership is verified by walking unit → property → landlord and
 * confirming the landlord matches the authed PM's owned landlord.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

interface UnitPatchPayload {
  name?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqFt?: number | null;
  rentAmount?: number;
  isAvailable?: boolean;
  amenities?: string[];
  images?: string[];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const unit = await prisma.unit.findFirst({
      where: { id, property: { landlordId: landlord.id, status: { not: 'deleted' } } },
      select: { id: true },
    });
    if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as UnitPatchPayload;

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (body.bedrooms === null || typeof body.bedrooms === 'number') data.bedrooms = body.bedrooms;
    if (body.bathrooms === null || typeof body.bathrooms === 'number') data.bathrooms = body.bathrooms;
    if (body.sizeSqFt === null || typeof body.sizeSqFt === 'number') data.sizeSqFt = body.sizeSqFt;
    if (typeof body.rentAmount === 'number' && Number.isFinite(body.rentAmount)) {
      data.rentAmount = body.rentAmount;
    }
    if (typeof body.isAvailable === 'boolean') data.isAvailable = body.isAvailable;
    if (Array.isArray(body.amenities)) data.amenities = body.amenities;
    if (Array.isArray(body.images)) data.images = body.images;

    await prisma.unit.update({ where: { id: unit.id }, data });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('unit patch', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
