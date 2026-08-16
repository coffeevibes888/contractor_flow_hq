/**
 * GET /api/mobile/public/listings
 *
 * Public listings feed for the mobile app's listings grid. Returns properties
 * across all landlords that have at least one available unit. Filterable by
 * type (apartment, house, etc.) and free-text search.
 *
 * No auth required — this powers the prospective-renter discovery flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

interface AddressJson {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const type = searchParams.get('type') ?? null;
    const landlordParam = searchParams.get('landlord')?.trim() ?? '';

    const where: any = {
      status: 'active',
      units: { some: { isAvailable: true } },
    };
    if (type && type !== 'all') {
      where.type = { equals: type, mode: 'insensitive' };
    }
    if (landlordParam) {
      // Accept either landlord id or subdomain so the mobile app can
      // pin listings to a specific PM (e.g. when opened from a tenant
      // portal or shared subdomain link).
      where.landlord = {
        OR: [
          { id: landlordParam },
          { subdomain: { equals: landlordParam, mode: 'insensitive' } },
        ],
      };
    }
    if (q) {
      // Postgres jsonb_path / text search would be ideal, but a simple
      // contains across name + address keeps this dependency-free.
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        landlord: {
          select: { id: true, companyName: true, subdomain: true },
        },
        units: {
          where: { isAvailable: true },
          select: {
            id: true,
            name: true,
            rentAmount: true,
            isAvailable: true,
            bedrooms: true,
            bathrooms: true,
            sizeSqFt: true,
            images: true,
          },
          take: 1, // we just need one for cover/rent calc
        },
      },
    });

    return NextResponse.json({
      listings: properties.flatMap((p) => {
        const rents = p.units.map((u) => Number(u.rentAmount ?? 0)).filter((r) => r > 0);
        if (rents.length === 0) return [];
        const sample = p.units[0];
        const addr = (p.address ?? {}) as AddressJson;
        return [{
          id: p.id,
          slug: p.slug,
          name: p.name,
          type: p.type,
          city: addr.city ?? '',
          state: addr.state ?? '',
          coverImage: sample?.images?.[0] ?? null,
          beds: sample?.bedrooms ?? null,
          baths: sample?.bathrooms ? Number(sample.bathrooms) : null,
          sizeSqFt: sample?.sizeSqFt ?? null,
          rent: Math.min(...rents),
          unitCount: p.units.length,
          landlordName: p.landlord?.companyName ?? 'Property Manager',
          landlordSubdomain: p.landlord?.subdomain ?? '',
        }];
      }),
    });
  } catch (e) {
    console.error('public listings', e);
    return NextResponse.json({ error: 'Server error', listings: [] }, { status: 500 });
  }
}
