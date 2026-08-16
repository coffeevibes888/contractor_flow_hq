/**
 * GET  /api/mobile/pm/properties/wizard/[id]  — load existing property in
 *                                               wizard form-data shape
 * PUT  /api/mobile/pm/properties/wizard/[id]  — update from wizard
 *
 * Mirrors the website's `/api/properties/wizard/[id]` handlers but uses
 * mobile-token auth so the app can edit properties through the same
 * step-by-step flow the dashboard uses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

const DB_TYPE_TO_WIZARD: Record<string, string> = {
  house: 'single_family',
  room: 'room_rental',
  apartment: 'apartment_unit',
  commercial: 'commercial',
  condo: 'condo',
  townhouse: 'townhouse',
  multi_family: 'multi_family',
  land: 'land',
};

const WIZARD_TYPE_TO_DB: Record<string, string> = {
  single_family: 'house',
  room_rental: 'room',
  apartment_unit: 'apartment',
  apartment_complex: 'apartment',
  commercial: 'commercial',
  condo: 'condo',
  townhouse: 'townhouse',
  multi_family: 'multi_family',
  land: 'land',
};

async function ctxFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true },
  });
  return landlord ? { landlordId: landlord.id, userId: payload.userId } : null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await ctxFromToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;

    const property = await prisma.property.findFirst({
      where: { id, landlordId: auth.landlordId, status: { not: 'deleted' } },
      include: { units: { orderBy: { createdAt: 'asc' } } },
    });
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const address = (property.address || {}) as {
      street?: string; city?: string; state?: string;
      zip?: string; unit?: string | null;
    };

    const dbType = property.type || 'house';
    let wizardType = DB_TYPE_TO_WIZARD[dbType] || 'single_family';
    if (dbType === 'apartment' && property.units.length > 1) wizardType = 'apartment_complex';
    else if (dbType === 'room') wizardType = 'room_rental';

    const unit = property.units[0];
    const allImages = property.units.flatMap((u) => u.images || []);
    const uniqueImages = Array.from(new Set(allImages));

    const formData: Record<string, unknown> = {
      name: property.name,
      slug: property.slug,
      description: property.description || '',
      streetAddress: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zip || '',
      unitNumber: address.unit || unit?.name || '',
      bedrooms: unit?.bedrooms ?? 0,
      bathrooms: unit?.bathrooms ? Number(unit.bathrooms) : 0,
      sizeSqFt: unit?.sizeSqFt ?? undefined,
      amenities: property.amenities || [],
      petPolicy: 'case_by_case',
      images: uniqueImages,
      imageLabels: [],
      rentAmount: unit?.rentAmount ? Number(unit.rentAmount) : undefined,
      videoUrl: property.videoUrl || '',
      virtualTourUrl: property.virtualTourUrl || '',
    };

    if (wizardType === 'room_rental') {
      formData.totalRooms = property.units.length;
      formData.rooms = property.units.map((u) => ({
        id: u.id,
        name: u.name,
        sizeSqFt: u.sizeSqFt ?? undefined,
        isFurnished: false,
        hasPrivateBath: (u.bathrooms ? Number(u.bathrooms) : 0) > 0,
        rentAmount: u.rentAmount ? Number(u.rentAmount) : undefined,
        images: u.images || [],
        amenities: u.amenities || [],
      }));
    }

    if (wizardType === 'apartment_complex') {
      const buildings = new Set(property.units.map((u) => u.building).filter(Boolean));
      const floors = new Set(property.units.map((u) => u.floor).filter(Boolean));
      formData.totalBuildings = Math.max(1, buildings.size);
      formData.floorsPerBuilding = Math.max(1, floors.size);
      formData.unitsPerFloor = Math.max(
        1,
        Math.ceil(property.units.length / ((buildings.size || 1) * (floors.size || 1))),
      );
      formData.complexAmenities = property.amenities || [];
    }

    return NextResponse.json({
      propertyId: property.id,
      propertyType: wizardType,
      listingType: 'rent',
      formData,
    });
  } catch (error: any) {
    console.error('[mobile/pm/properties/wizard/[id] GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to load property' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await ctxFromToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;

    const existing = await prisma.property.findFirst({
      where: { id, landlordId: auth.landlordId },
      include: { units: { orderBy: { createdAt: 'asc' } } },
    });
    if (!existing) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const body = await req.json();
    const { propertyType, formData } = body as {
      propertyType: string;
      formData: Record<string, any>;
    };

    if (!formData?.name || !formData?.streetAddress || !formData?.city || !formData?.state || !formData?.zipCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (formData.slug && formData.slug !== existing.slug) {
      const taken = await prisma.property.findFirst({
        where: { slug: formData.slug, id: { not: existing.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { error: 'A property with this URL already exists. Try a different one.' },
          { status: 400 },
        );
      }
    }

    const dbType = WIZARD_TYPE_TO_DB[propertyType] || existing.type;

    const updated = await prisma.property.update({
      where: { id: existing.id },
      data: {
        name: formData.name,
        slug: formData.slug || existing.slug,
        description: formData.description || null,
        type: dbType,
        address: {
          street: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          zip: formData.zipCode,
          unit: formData.unitNumber || null,
        },
        amenities:
          propertyType === 'apartment_complex'
            ? formData.complexAmenities || []
            : formData.amenities || [],
        videoUrl: formData.videoUrl || null,
        virtualTourUrl: formData.virtualTourUrl || null,
      },
    });

    const simpleTypes = ['single_family', 'apartment_unit', 'condo', 'townhouse'];
    if (simpleTypes.includes(propertyType) && existing.units.length > 0) {
      const unit = existing.units[0];
      await prisma.unit.update({
        where: { id: unit.id },
        data: {
          name: formData.unitNumber || unit.name,
          bedrooms: formData.bedrooms ?? unit.bedrooms,
          bathrooms: formData.bathrooms ?? unit.bathrooms,
          sizeSqFt: formData.sizeSqFt ?? unit.sizeSqFt,
          rentAmount: formData.rentAmount ?? unit.rentAmount,
          amenities: formData.amenities || unit.amenities,
          images: formData.images || unit.images,
        },
      });
    }

    return NextResponse.json({
      success: true,
      propertyId: updated.id,
      message: 'Property updated successfully',
    });
  } catch (error: any) {
    console.error('[mobile/pm/properties/wizard/[id] PUT]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Could not update property' },
      { status: 500 },
    );
  }
}
