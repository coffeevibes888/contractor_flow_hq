import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

const ALLOWED_ROLES = ['admin', 'superAdmin', 'landlord', 'property_manager'];

// Map DB type -> wizard propertyType
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

// Map wizard propertyType -> DB type
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

async function authorize() {
  const session = await auth();
  if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role as string)) {
    return { ok: false as const, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    return { ok: false as const, error: NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 }) };
  }
  return { ok: true as const, landlordId: landlordResult.landlord.id };
}

// GET - Load a property formatted for the wizard
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize();
    if (!auth.ok) return auth.error;

    const { id } = await context.params;

    const property = await prisma.property.findFirst({
      where: { id, landlordId: auth.landlordId },
      include: {
        units: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const address = (property.address || {}) as {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      unit?: string | null;
    };

    // Determine wizard propertyType - apartment with many units = complex
    const dbType = property.type || 'house';
    let wizardType = DB_TYPE_TO_WIZARD[dbType] || 'single_family';
    if (dbType === 'apartment' && property.units.length > 1) {
      wizardType = 'apartment_complex';
    } else if (dbType === 'room') {
      wizardType = 'room_rental';
    }

    // Gather first unit for details
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

    // Room rental: serialize rooms
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

    // Apartment complex: summarize structure
    if (wizardType === 'apartment_complex') {
      const buildings = new Set(property.units.map((u) => u.building).filter(Boolean));
      const floors = new Set(property.units.map((u) => u.floor).filter(Boolean));
      formData.totalBuildings = Math.max(1, buildings.size);
      formData.floorsPerBuilding = Math.max(1, floors.size);
      formData.unitsPerFloor = Math.max(
        1,
        Math.ceil(property.units.length / ((buildings.size || 1) * (floors.size || 1)))
      );
      formData.complexAmenities = property.amenities || [];
    }

    return NextResponse.json({
      propertyId: property.id,
      propertyType: wizardType,
      listingType: 'rent',
      formData,
    });
  } catch (error) {
    console.error('Error loading property for wizard:', error);
    return NextResponse.json(
      { error: 'Failed to load property' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing property from the wizard
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize();
    if (!auth.ok) return auth.error;

    const { id } = await context.params;

    const existing = await prisma.property.findFirst({
      where: { id, landlordId: auth.landlordId },
      include: { units: { orderBy: { createdAt: 'asc' } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const body = await req.json();
    const { propertyType, formData } = body as {
      propertyType: string;
      formData: Record<string, any>;
    };

    if (!formData?.name || !formData?.streetAddress || !formData?.city || !formData?.state || !formData?.zipCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If slug changed, ensure uniqueness
    if (formData.slug && formData.slug !== existing.slug) {
      const slugTaken = await prisma.property.findFirst({
        where: { slug: formData.slug, id: { not: existing.id } },
      });
      if (slugTaken) {
        return NextResponse.json(
          { error: 'Slug already in use', message: 'A property with this URL slug already exists.' },
          { status: 400 }
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
        // Only update defaultLeaseDocumentId when the wizard explicitly provides one
        ...(formData.leaseDocumentId ? { defaultLeaseDocumentId: formData.leaseDocumentId } : {}),
      },
    });

    // Update the first/default unit for simple property types
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

    // Sync rooms for room rental properties
    if (propertyType === 'room_rental' && Array.isArray(formData.rooms)) {
      const incomingRooms: Array<{
        id?: string;
        name: string;
        sizeSqFt?: number;
        isFurnished?: boolean;
        hasPrivateBath?: boolean;
        rentAmount?: number;
        images?: string[];
        amenities?: string[];
      }> = formData.rooms;

      // Build a map of existing DB units by their id so we can match them
      const existingById = new Map(existing.units.map((u) => [u.id, u]));

      for (const room of incomingRooms) {
        if (room.id && existingById.has(room.id)) {
          // Existing room — update fields but never touch tenant / lease / availability
          await prisma.unit.update({
            where: { id: room.id },
            data: {
              name: room.name,
              sizeSqFt: room.sizeSqFt ?? null,
              bathrooms: room.hasPrivateBath ? 1 : 0,
              rentAmount: room.rentAmount ?? null,
              images: room.images || [],
              amenities: room.amenities || [],
            },
          });
        } else {
          // New room — create it as available
          await prisma.unit.create({
            data: {
              propertyId: existing.id,
              name: room.name,
              type: 'room',
              sizeSqFt: room.sizeSqFt ?? null,
              bathrooms: room.hasPrivateBath ? 1 : 0,
              rentAmount: room.rentAmount ?? null,
              images: room.images || [],
              amenities: room.amenities || [],
              isAvailable: true,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      propertyId: updated.id,
      message: 'Property updated successfully',
    });
  } catch (error) {
    console.error('Error updating property:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update property';
    return NextResponse.json({ error: errorMessage, message: errorMessage }, { status: 500 });
  }
}
