/**
 * POST /api/mobile/pm/properties/wizard
 *
 * Mobile mirror of the website's `/api/properties/wizard` POST. Uses
 * mobile-token auth, but otherwise creates the property + units exactly
 * like the website wizard does, so a property created from the app is
 * indistinguishable from one created from the dashboard.
 *
 * Body:
 *   {
 *     propertyType: 'single_family'|'room_rental'|'apartment_unit'|
 *                   'apartment_complex'|'commercial'|'condo'|'townhouse'|
 *                   'multi_family'|'land',
 *     listingType:  'rent' | 'sale',
 *     formData: {
 *       name, slug, description?, streetAddress, city, state, zipCode,
 *       unitNumber?, bedrooms?, bathrooms?, sizeSqFt?, amenities?,
 *       images?, rentAmount?, depositAmount?, availableFrom?, salePrice?,
 *       totalRooms?, rooms?: [...],
 *       totalBuildings?, floorsPerBuilding?, unitsPerFloor?,
 *       unitTemplates?: [...], complexAmenities?,
 *       videoUrl?, virtualTourUrl?,
 *       // commercial:
 *       zoningType?, leaseType?, camCharges?, electricalCapacity?,
 *       hvacType?, loadingDock?, parkingSpaces?,
 *     }
 *   }
 *
 * Response: { success: true, propertyId, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

const TYPE_MAP: Record<string, string> = {
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

function genSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'property';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { propertyType, formData } = body as {
      propertyType: string;
      listingType?: 'rent' | 'sale';
      formData: Record<string, any>;
    };

    if (!propertyType || !formData) {
      return NextResponse.json({ error: 'propertyType and formData are required' }, { status: 400 });
    }
    if (!formData.name || !formData.streetAddress || !formData.city || !formData.state || !formData.zipCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Slug — use provided or generate.
    const slug = (formData.slug && String(formData.slug).trim()) || genSlug(formData.name);
    const slugTaken = await prisma.property.findFirst({ where: { slug }, select: { id: true } });
    if (slugTaken) {
      return NextResponse.json(
        { error: 'A property with this URL already exists. Try a different name.' },
        { status: 400 },
      );
    }

    const dbType = TYPE_MAP[propertyType] ?? 'house';

    const property = await prisma.property.create({
      data: {
        landlordId: ctx.landlordId,
        name: formData.name,
        slug,
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

    // Default unit for simple residential properties.
    if (['single_family', 'apartment_unit', 'condo', 'townhouse'].includes(propertyType)) {
      await prisma.unit.create({
        data: {
          propertyId: property.id,
          name: formData.unitNumber || 'Main Unit',
          type: dbType,
          bedrooms: formData.bedrooms ?? 0,
          bathrooms: formData.bathrooms ?? 1,
          sizeSqFt: formData.sizeSqFt ?? null,
          rentAmount: formData.rentAmount ?? 0,
          amenities: formData.amenities || [],
          images: formData.images || [],
          isAvailable: true,
          availableFrom: formData.availableFrom ? new Date(formData.availableFrom) : new Date(),
        },
      });
    }

    // Room rental — one unit per room.
    if (propertyType === 'room_rental' && Array.isArray(formData.rooms)) {
      const propertyImages = formData.images || [];
      for (const room of formData.rooms) {
        await prisma.unit.create({
          data: {
            propertyId: property.id,
            name: room.name,
            type: 'room',
            bedrooms: 1,
            bathrooms: room.hasPrivateBath ? 1 : 0,
            sizeSqFt: room.sizeSqFt ?? null,
            rentAmount: room.rentAmount ?? 0,
            amenities: room.amenities || [],
            images: room.images?.length ? room.images : propertyImages,
            isAvailable: true,
          },
        });
      }
    }

    // Apartment complex — generate units from the template grid.
    if (propertyType === 'apartment_complex') {
      const totalBuildings = formData.totalBuildings || 1;
      const floorsPerBuilding = formData.floorsPerBuilding || 1;
      const unitsPerFloor = formData.unitsPerFloor || 1;

      type Tpl = {
        id: string; name: string; bedrooms: number; bathrooms: number;
        sizeSqFt?: number; baseRent?: number; amenities: string[]; images: string[];
      };
      let templates: Tpl[] = formData.unitTemplates || [];
      if (templates.length === 0) {
        templates = [{
          id: 'default', name: 'Standard Unit',
          bedrooms: 1, bathrooms: 1, baseRent: 1000,
          amenities: [], images: [],
        }];
      }

      const totalUnits = totalBuildings * floorsPerBuilding * unitsPerFloor;
      const perTemplate = Math.floor(totalUnits / templates.length);
      const remainder = totalUnits % templates.length;
      const pool: Tpl[] = [];
      templates.forEach((tpl, idx) => {
        const count = perTemplate + (idx < remainder ? 1 : 0);
        for (let i = 0; i < count; i++) pool.push(tpl);
      });

      let p = 0;
      for (let b = 0; b < totalBuildings; b++) {
        const buildingLetter = totalBuildings > 1 ? String.fromCharCode(65 + b) : null;
        for (let f = 1; f <= floorsPerBuilding; f++) {
          for (let u = 1; u <= unitsPerFloor; u++) {
            const tpl = pool[p++] || templates[0];
            const num = `${f}${String(u).padStart(2, '0')}`;
            const name = buildingLetter ? `${buildingLetter}-${num}` : num;
            await prisma.unit.create({
              data: {
                propertyId: property.id,
                name,
                type: 'apartment',
                building: buildingLetter,
                floor: f,
                bedrooms: tpl.bedrooms || 1,
                bathrooms: tpl.bathrooms || 1,
                sizeSqFt: tpl.sizeSqFt ?? null,
                rentAmount: tpl.baseRent || 0,
                amenities: tpl.amenities || [],
                images: tpl.images || [],
                isAvailable: true,
                availableFrom: new Date(),
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      propertyId: property.id,
      message: 'Property created successfully',
    });
  } catch (error: any) {
    console.error('[mobile/pm/properties/wizard POST]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Could not create property' },
      { status: 500 },
    );
  }
}
