import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { generateLeaseHtml, buildLeaseDataFromRecords, LeaseBuilderData } from '@/lib/services/lease-builder';
import { htmlToPdfBuffer } from '@/lib/services/pdf';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    const body = await req.json();
    const { propertyId, unitId, tenantId, leaseTerms, customizations, saveAsTemplate, rentAmount, unitName, propertyData } = body;

    // Support inline propertyData (e.g. wizard create flow where property isn't in DB yet)
    let propertyRecord: { name: string; slug: string; address: any; amenities: string[] } | null = null;
    if (propertyData) {
      propertyRecord = {
        ...propertyData,
        slug: propertyData.slug || propertyData.name?.toLowerCase().replace(/\s+/g, '-') || 'property',
      };
    } else {
      // Fetch property from DB
      const dbProperty = await prisma.property.findFirst({
        where: { id: propertyId, landlordId: landlord.id },
      });
      if (!dbProperty) {
        return NextResponse.json({ message: 'Property not found' }, { status: 404 });
      }
      propertyRecord = {
        name: dbProperty.name,
        slug: dbProperty.slug,
        address: dbProperty.address,
        amenities: dbProperty.amenities,
      };
    }

    // Fetch unit if provided (optional now)
    let unit = null;
    if (unitId) {
      unit = await prisma.unit.findFirst({
        where: { id: unitId, propertyId },
      });
    }

    // Get rent amount - from unit or from request body
    const effectiveRentAmount = unit ? Number(unit.rentAmount) : (rentAmount || 0);
    const effectiveUnitName = unit ? unit.name : (unitName || 'Unit');
    const effectiveUnitType = unit ? unit.type : 'unit';

    if (!effectiveRentAmount || effectiveRentAmount <= 0) {
      return NextResponse.json({ message: 'Rent amount is required' }, { status: 400 });
    }

    // Fetch tenant if provided
    let tenant = null;
    if (tenantId) {
      tenant = await prisma.user.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, email: true },
      });
    }

    // Build lease data
    const propertyAddress = propertyRecord.address as { street?: string; city?: string; state?: string; zipCode?: string } | null;

    const leaseData = buildLeaseDataFromRecords({
      landlord: {
        name: landlord.name,
        companyName: landlord.companyName,
        companyAddress: landlord.companyAddress,
        companyEmail: landlord.companyEmail,
        companyPhone: landlord.companyPhone,
        securityDepositMonths: Number(landlord.securityDepositMonths) || 1,
        petDepositEnabled: landlord.petDepositEnabled,
        petDepositAmount: landlord.petDepositAmount ? Number(landlord.petDepositAmount) : null,
        petRentEnabled: landlord.petRentEnabled,
        petRentAmount: landlord.petRentAmount ? Number(landlord.petRentAmount) : null,
        cleaningFeeEnabled: landlord.cleaningFeeEnabled,
        cleaningFeeAmount: landlord.cleaningFeeAmount ? Number(landlord.cleaningFeeAmount) : null,
      },
      property: {
        name: propertyRecord.name,
        address: {
          street: propertyAddress?.street || '',
          city: propertyAddress?.city || '',
          state: propertyAddress?.state || '',
          zipCode: propertyAddress?.zipCode || '',
        },
        amenities: propertyRecord.amenities || [],
      },
      unit: {
        name: effectiveUnitName,
        type: effectiveUnitType,
        rentAmount: effectiveRentAmount,
      },
      tenant: tenant ? {
        name: tenant.name || '[TENANT NAME]',
        email: tenant.email || '[TENANT EMAIL]',
      } : {
        name: '[TENANT NAME]',
        email: '[TENANT EMAIL]',
      },
      leaseTerms: {
        startDate: leaseTerms?.startDate ? new Date(leaseTerms.startDate) : new Date(),
        endDate: leaseTerms?.endDate ? new Date(leaseTerms.endDate) : null,
        isMonthToMonth: leaseTerms?.isMonthToMonth ?? true,
        billingDayOfMonth: leaseTerms?.billingDayOfMonth ?? 1,
      },
      customizations,
    });

    // Generate HTML
    const html = generateLeaseHtml(leaseData);

    let fileUrl: string;
    let fileType: string;
    let fileSize: number;

    // Try to generate PDF, fallback to HTML if it fails
    try {
      const pdfBuffer = await htmlToPdfBuffer(html);
      
      // Upload PDF to Cloudinary
      const result = await uploadToCloudinary(pdfBuffer, {
        folder: `leases/${landlord.id}`,
        resource_type: 'raw',
        public_id: `lease-${propertyRecord.slug}-${effectiveUnitName.replace(/\s+/g, '-')}-${Date.now()}`,
      });
      
      fileUrl = result.secure_url;
      fileType = 'pdf';
      fileSize = pdfBuffer.length;
    } catch (pdfError: any) {
      console.warn('PDF generation failed, falling back to HTML:', pdfError.message);
      
      // Upload HTML as fallback
      const htmlBuffer = Buffer.from(html, 'utf-8');
      const result = await uploadToCloudinary(htmlBuffer, {
        folder: `leases/${landlord.id}`,
        resource_type: 'raw',
        public_id: `lease-${propertyRecord.slug}-${effectiveUnitName.replace(/\s+/g, '-')}-${Date.now()}.html`,
      });
      
      fileUrl = result.secure_url;
      fileType = 'html';
      fileSize = htmlBuffer.length;
    }

    // Create LegalDocument record
    const document = await prisma.legalDocument.create({
      data: {
        landlordId: landlord.id,
        name: `Lease - ${propertyRecord.name} ${effectiveUnitName}`,
        type: 'lease',
        category: 'generated',
        state: propertyAddress?.state || null,
        fileUrl,
        fileType,
        fileSize,
        isTemplate: saveAsTemplate || false,
        isActive: true,
        isFieldsConfigured: true,
        description: `Auto-generated lease for ${propertyRecord.name} - ${effectiveUnitName}`,
        signatureFields: generateSignatureFields(leaseData.tenantNames.length),
      },
    });

    return NextResponse.json({
      success: true,
      document,
      pdfUrl: fileUrl,
      html,
      fileType,
    });
  } catch (error: any) {
    console.error('Failed to generate lease:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    return NextResponse.json({ 
      message: error?.message || 'Failed to generate lease',
      error: process.env.NODE_ENV === 'development' ? error?.stack : undefined 
    }, { status: 500 });
  }
}

/**
 * Generate pre-configured signature fields for the lease
 * These are positioned at the signature section of the generated PDF
 */
function generateSignatureFields(tenantCount: number) {
  const fields = [];
  
  // Landlord signature - positioned at signature section
  fields.push({
    id: 'landlord_signature',
    type: 'signature',
    role: 'landlord',
    page: -1, // Last page
    x: 10,
    y: 35,
    width: 25,
    height: 5,
    required: true,
    label: 'Landlord Signature',
  });
  
  fields.push({
    id: 'landlord_date',
    type: 'date',
    role: 'landlord',
    page: -1,
    x: 10,
    y: 42,
    width: 15,
    height: 3,
    required: true,
    label: 'Date',
  });

  // Tenant signatures
  for (let i = 0; i < tenantCount; i++) {
    const yOffset = 50 + (i * 18);
    
    fields.push({
      id: `tenant_${i}_signature`,
      type: 'signature',
      role: 'tenant',
      page: -1,
      x: 10,
      y: yOffset,
      width: 25,
      height: 5,
      required: true,
      label: `Tenant ${tenantCount > 1 ? i + 1 : ''} Signature`,
    });
    
    fields.push({
      id: `tenant_${i}_date`,
      type: 'date',
      role: 'tenant',
      page: -1,
      x: 10,
      y: yOffset + 7,
      width: 15,
      height: 3,
      required: true,
      label: 'Date',
    });
  }

  return fields;
}
