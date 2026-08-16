import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { randomUUID } from 'crypto';
import { extractTextFromImage } from '@/lib/services/ocr-service';

function isAllowedCategory(category: string) {
  return (
    category === 'id_verification' ||
    category === 'income_verification' ||
    category === 'address_verification' ||
    category === 'other'
  );
}

function isAllowedDocType(docType: string) {
  return (
    docType === 'drivers_license' ||
    docType === 'passport' ||
    docType === 'state_id' ||
    docType === 'paystub' ||
    docType === 'w2' ||
    docType === 'tax_return' ||
    docType === 'bank_statement' ||
    docType === 'other'
  );
}

/**
 * Validates that an uploaded image is actually an ID document
 * Uses OCR to check for ID-related keywords and patterns
 */
async function validateIdDocument(imageBuffer: Buffer, fileName: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Check file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    
    if (!ext || !imageExtensions.includes(ext)) {
      return { valid: false, reason: 'File must be an image (JPG, PNG, etc.)' };
    }

    // Convert buffer to base64 data URL for Tesseract
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/${ext};base64,${base64}`;

    // Extract text using OCR
    const ocrResult = await extractTextFromImage(dataUrl);
    
    // Check confidence threshold
    if (ocrResult.confidence < 30) {
      return { valid: false, reason: 'Image quality too low. Please upload a clear, well-lit photo of your ID.' };
    }

    // Normalize extracted text for keyword checking
    const text = ocrResult.text.toUpperCase();
    
    // Check for ID-related keywords
    const idKeywords = [
      'DRIVER', 'DRIVERS', 'LICENSE', 'LIC',
      'STATE ID', 'STATEID', 'IDENTIFICATION',
      'PASSPORT', 'PASSPORT NO', 'PASSPORT NUMBER',
      'DATE OF BIRTH', 'DOB', 'BIRTH',
      'EXPIRES', 'EXPIRATION', 'EXP DATE', 'VALID',
      'ISSUE DATE', 'ISSUED',
      'ADDRESS', 'STREET',
      'HEIGHT', 'WEIGHT', 'SEX', 'GENDER',
      'ORGAN DONOR', 'DONOR',
      'CLASS', 'RESTRICTIONS',
      'ENDORSEMENTS'
    ];

    const foundKeywords = idKeywords.filter(keyword => text.includes(keyword));
    
    // Need at least 3 ID-related keywords to be considered valid
    if (foundKeywords.length < 3) {
      return { 
        valid: false, 
        reason: 'This does not appear to be a valid ID document. Please upload a clear photo of your driver\'s license, state ID, or passport.' 
      };
    }

    // Check for date patterns (MM/DD/YYYY, DD/MM/YYYY, etc.)
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY or DD/MM/YYYY
      /\d{4}-\d{2}-\d{2}/,        // YYYY-MM-DD
      /\d{2}\/\d{2}\/\d{2}/,      // MM/DD/YY
    ];
    
    const hasDate = datePatterns.some(pattern => pattern.test(text));
    
    if (!hasDate) {
      return { 
        valid: false, 
        reason: 'Could not detect date information in the document. Please ensure your ID is clearly visible.' 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('ID validation error:', error);
    // If OCR fails, reject the upload
    return { 
      valid: false, 
      reason: 'Unable to verify ID document. Please upload a clear, well-lit photo of your ID.' 
    };
  }
}

async function resolveLandlordIdForApplication(application: {
  unitId: string | null;
  propertySlug: string | null;
}) {
  if (application.unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: application.unitId },
      select: { property: { select: { landlordId: true } } },
    });
    return unit?.property?.landlordId || null;
  }

  if (application.propertySlug) {
    const property = await prisma.property.findUnique({
      where: { slug: application.propertySlug },
      select: { landlordId: true },
    });
    return property?.landlordId || null;
  }

  return null;
}

async function assertCanAccessApplication(params: {
  session: any;
  applicationId: string;
}) {
  const { session, applicationId } = params;

  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicantId: true,
      unitId: true,
      propertySlug: true,
    },
  });

  if (!application) {
    return { ok: false as const, status: 404 as const, message: 'Application not found' };
  }

  const role = session?.user?.role;
  const userId = session?.user?.id as string | undefined;

  if (!userId) {
    return { ok: false as const, status: 401 as const, message: 'Not authenticated' };
  }

  if (role === 'tenant') {
    if (application.applicantId !== userId) {
      return { ok: false as const, status: 403 as const, message: 'Forbidden' };
    }

    const landlordId = await resolveLandlordIdForApplication({
      unitId: application.unitId,
      propertySlug: application.propertySlug,
    });

    if (!landlordId) {
      return { ok: false as const, status: 400 as const, message: 'Unable to determine landlord for application' };
    }

    return { ok: true as const, application, landlordId };
  }

  if (role === 'admin' || role === 'superAdmin' || role === 'landlord' || role === 'property_manager') {
    const landlordId = await resolveLandlordIdForApplication({
      unitId: application.unitId,
      propertySlug: application.propertySlug,
    });

    if (!landlordId) {
      return { ok: false as const, status: 400 as const, message: 'Unable to determine landlord for application' };
    }

    if (role === 'admin' || role === 'superAdmin') {
      return { ok: true as const, application, landlordId };
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: userId },
      select: { id: true },
    });

    if (!landlord || landlord.id !== landlordId) {
      return { ok: false as const, status: 403 as const, message: 'Forbidden' };
    }

    return { ok: true as const, application, landlordId };
  }

  return { ok: false as const, status: 403 as const, message: 'Forbidden' };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ success: false, message: 'applicationId is required' }, { status: 400 });
    }

    const access = await assertCanAccessApplication({ session, applicationId });
    if (!access.ok) {
      return NextResponse.json({ success: false, message: access.message }, { status: access.status });
    }

    const prismaAny = prisma as any;
    const documents = await prismaAny.applicationDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error('List application documents error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, message: 'Invalid form data' }, { status: 400 });
    }

    const applicationId = formData.get('applicationId');
    const category = formData.get('category');
    const docType = formData.get('docType');
    const file = formData.get('file');

    if (typeof applicationId !== 'string' || !applicationId) {
      return NextResponse.json({ success: false, message: 'applicationId is required' }, { status: 400 });
    }

    if (typeof category !== 'string' || !isAllowedCategory(category)) {
      return NextResponse.json({ success: false, message: 'Invalid category' }, { status: 400 });
    }

    if (typeof docType !== 'string' || !isAllowedDocType(docType)) {
      return NextResponse.json({ success: false, message: 'Invalid docType' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'file is required' }, { status: 400 });
    }

    const access = await assertCanAccessApplication({ session, applicationId });
    if (!access.ok) {
      return NextResponse.json({ success: false, message: access.message }, { status: access.status });
    }

    const mimeType = typeof file.type === 'string' && file.type ? file.type : 'application/octet-stream';
    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Validate ID documents - ensure they are actual IDs
    if (category === 'id_verification' && resourceType === 'image') {
      const validation = await validateIdDocument(fileBuffer, file.name);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: validation.reason || 'Invalid ID document' },
          { status: 400 }
        );
      }
    }

    const publicId = `tenant-applications/${access.landlordId}/${applicationId}/${category}-${docType}-${randomUUID()}`;

    const uploaded = await uploadToCloudinary(fileBuffer, {
      resource_type: resourceType,
      type: 'authenticated',
      public_id: publicId,
      overwrite: false,
    });

    const prismaAny = prisma as any;
    const created = await prismaAny.applicationDocument.create({
      data: {
        applicationId,
        landlordId: access.landlordId,
        uploadedById: session.user.id,
        category,
        docType,
        originalFileName: file.name || 'upload',
        mimeType,
        fileSize: file.size,
        cloudinaryPublicId: uploaded.public_id,
        cloudinaryResourceType: resourceType,
        status: 'uploaded',
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Upload application document error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
