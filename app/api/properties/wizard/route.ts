import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

// POST - Create property from wizard
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const allowedRoles = ['admin', 'superAdmin', 'landlord', 'property_manager'];
    
    if (!session?.user?.id || !allowedRoles.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized', message: 'You must be logged in as a landlord or admin to create properties' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 });
    }

    const body = await req.json();
    const { propertyType, listingType, formData, draftId } = body;

    // Validate required fields
    if (!formData.name || !formData.streetAddress || !formData.city || !formData.state || !formData.zipCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for duplicate slug (globally unique)
    const existingProperty = await prisma.property.findFirst({
      where: {
        slug: formData.slug,
      },
    });

    if (existingProperty) {
      return NextResponse.json({ 
        error: 'A property with this URL slug already exists', 
        message: 'A property with this URL slug already exists. Please use a different slug.' 
      }, { status: 400 });
    }

    // Map property type to database type
    const typeMapping: Record<string, string> = {
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

    // Validate the chosen lease document belongs to this landlord (if provided)
    if (formData.leaseDocumentId) {
      const leaseDoc = await prisma.legalDocument.findFirst({
        where: { id: formData.leaseDocumentId, landlordId: landlordResult.landlord.id },
      });
      if (!leaseDoc) {
        return NextResponse.json({ error: 'Invalid lease document', message: 'The selected lease template was not found.' }, { status: 400 });
      }
    }

    // Create the property
    const shouldPublish = formData.listPublicly === true;
    const property = await prisma.property.create({
      data: {
        landlordId: landlordResult.landlord.id,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        type: typeMapping[propertyType] || 'house',
        isPublished: shouldPublish,
        address: {
          street: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          zip: formData.zipCode,
          unit: formData.unitNumber || null,
        },
        amenities: propertyType === 'apartment_complex'
          ? (formData.complexAmenities || [])
          : (formData.amenities || []),
        videoUrl: formData.videoUrl || null,
        virtualTourUrl: formData.virtualTourUrl || null,
        ...(formData.leaseDocumentId ? { defaultLeaseDocumentId: formData.leaseDocumentId } : {}),
      },
    });

    // Create a default unit for single properties
    if (['single_family', 'apartment_unit', 'condo', 'townhouse'].includes(propertyType)) {
      await prisma.unit.create({
        data: {
          propertyId: property.id,
          name: formData.unitNumber || 'Main Unit',
          type: typeMapping[propertyType] || 'house',
          bedrooms: formData.bedrooms || 0,
          bathrooms: formData.bathrooms || 1,
          sizeSqFt: formData.sizeSqFt || null,
          rentAmount: formData.rentAmount || 0,
          amenities: formData.amenities || [],
          images: formData.images || [],
          isAvailable: false,
          availableFrom: formData.availableFrom ? new Date(formData.availableFrom) : null,
        },
      });
    }

    // Handle room rentals - create individual room units
    if (propertyType === 'room_rental' && formData.rooms) {
      // Use general property images for all rooms if no room-specific images
      const propertyImages = formData.images || [];
      
      for (const room of formData.rooms) {
        await prisma.unit.create({
          data: {
            propertyId: property.id,
            name: room.name,
            type: 'room',
            bedrooms: 1,
            bathrooms: room.hasPrivateBath ? 1 : 0,
            sizeSqFt: room.sizeSqFt || null,
            rentAmount: room.rentAmount || 0,
            amenities: room.amenities || [],
            // Use room-specific images if available, otherwise use property-level images
            images: (room.images && room.images.length > 0) ? room.images : propertyImages,
            isAvailable: false,
          },
        });
      }
    }

    // Handle apartment complexes - create units from templates
    if (propertyType === 'apartment_complex') {
      const totalBuildings = formData.totalBuildings || 1;
      const floorsPerBuilding = formData.floorsPerBuilding || 1;
      const unitsPerFloor = formData.unitsPerFloor || 1;
      
      interface UnitTemplate {
        id: string;
        name: string;
        bedrooms: number;
        bathrooms: number;
        sizeSqFt?: number;
        baseRent?: number;
        amenities: string[];
        images: string[];
      }
      
      let templates: UnitTemplate[] = formData.unitTemplates || [];

      // If no templates, create a default template
      if (templates.length === 0) {
        templates = [{
          id: 'default',
          name: 'Standard Unit',
          bedrooms: 1,
          bathrooms: 1,
          baseRent: 1000,
          amenities: [],
          images: [],
        }];
      }

      // Calculate total units and distribute templates
      const totalUnits = totalBuildings * floorsPerBuilding * unitsPerFloor;
      const unitsPerTemplate = Math.floor(totalUnits / templates.length);
      const remainder = totalUnits % templates.length;

      // Create a pool of template assignments
      const templatePool: UnitTemplate[] = [];
      templates.forEach((template: UnitTemplate, index: number) => {
        const count = unitsPerTemplate + (index < remainder ? 1 : 0);
        for (let i = 0; i < count; i++) {
          templatePool.push(template);
        }
      });

      let poolIndex = 0;
      for (let b = 0; b < totalBuildings; b++) {
        const buildingLetter = totalBuildings > 1 ? String.fromCharCode(65 + b) : null; // A, B, C...
        
        for (let f = 1; f <= floorsPerBuilding; f++) {
          for (let u = 1; u <= unitsPerFloor; u++) {
            const template = templatePool[poolIndex++] || templates[0];
            const unitNumber = `${f}${String(u).padStart(2, '0')}`; // 101, 102, 201, etc.
            const unitName = buildingLetter ? `${buildingLetter}-${unitNumber}` : unitNumber;

            await prisma.unit.create({
              data: {
                propertyId: property.id,
                name: unitName,
                type: 'apartment',
                building: buildingLetter,
                floor: f,
                bedrooms: template.bedrooms || 1,
                bathrooms: template.bathrooms || 1,
                sizeSqFt: template.sizeSqFt || null,
                rentAmount: template.baseRent || 0,
                amenities: template.amenities || [],
                images: template.images || [],
                isAvailable: false,
                availableFrom: null,
              },
            });
          }
        }
      }
    }

    // Delete draft if it exists
    if (draftId) {
      // Draft deletion would go here once draft table is created
    }

    return NextResponse.json({
      success: true,
      propertyId: property.id,
      message: 'Property created successfully',
    });
  } catch (error) {
    console.error('Error creating property:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create property';
    return NextResponse.json({ error: errorMessage, message: errorMessage }, { status: 500 });
  }
}
