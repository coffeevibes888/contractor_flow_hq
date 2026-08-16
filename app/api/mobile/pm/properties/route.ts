import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function GET(req: NextRequest) {
  try {
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

    if (!landlord) {
      return NextResponse.json({ properties: [] });
    }

    const properties = await prisma.property.findMany({
      where: { landlordId: landlord.id, status: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        address: true,
        createdAt: true,
        units: {
          select: {
            id: true,
            name: true,
            rentAmount: true,
            isAvailable: true,
            images: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    return NextResponse.json({
      properties: properties.map((p) => {
        const totalUnits = p.units.length;
        const availableUnits = p.units.filter((u) => u.isAvailable).length;
        const occupiedUnits = totalUnits - availableUnits;
        const totalRent = p.units.reduce((sum, u) => sum + (u.rentAmount ? Number(u.rentAmount) : 0), 0);
        const coverImage = p.units.find((u) => u.images?.length)?.images?.[0] ?? null;

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: p.type,
          address: p.address,
          createdAt: p.createdAt.toISOString(),
          totalUnits,
          availableUnits,
          occupiedUnits,
          totalRent,
          coverImage,
          units: p.units.map((u) => ({
            id: u.id,
            name: u.name,
            rentAmount: u.rentAmount ? Number(u.rentAmount) : 0,
            isAvailable: u.isAvailable,
          })),
        };
      }),
    });
  } catch (error) {
    console.error('[mobile/pm/properties]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


/**
 * POST — create a new property + initial unit (mirrors the website's
 * property wizard, condensed for mobile). Body shape:
 *
 *   {
 *     name: string,
 *     type: string,                                  // 'apartment' | 'house' | 'condo' | 'commercial'
 *     address: { street, city, state, zip },
 *     unitName?: string,                             // defaults to "Main Unit"
 *     rentAmount?: number,
 *     beds?: number,
 *     baths?: number,
 *     sizeSqFt?: number,
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, type, address, unitName, rentAmount, beds, baths, sizeSqFt } = body ?? {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }
    if (!address?.street || !address?.city || !address?.state || !address?.zip) {
      return NextResponse.json({ error: 'address.street/city/state/zip are required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) {
      return NextResponse.json({ error: 'No landlord profile' }, { status: 400 });
    }

    // Generate a unique-ish slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'property';
    const suffix = Math.random().toString(36).slice(2, 7);
    const slug = `${baseSlug}-${suffix}`;

    const property = await prisma.property.create({
      data: {
        landlordId: landlord.id,
        name: name.trim(),
        slug,
        type: type.trim().toLowerCase(),
        address: address as any,
        units: {
          create: [
            {
              name: (unitName ?? 'Main Unit').trim(),
              rentAmount: rentAmount != null ? Number(rentAmount) : 0,
              isAvailable: true,
              type: 'apartment',
              ...(beds != null ? { bedrooms: Number(beds) } : {}),
              ...(baths != null ? { bathrooms: Number(baths) } : {}),
              ...(sizeSqFt != null ? { sizeSqFt: Number(sizeSqFt) } : {}),
            },
          ],
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, propertyId: property.id }, { status: 201 });
  } catch (error: any) {
    console.error('[mobile/pm/properties POST]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not create property' }, { status: 500 });
  }
}
