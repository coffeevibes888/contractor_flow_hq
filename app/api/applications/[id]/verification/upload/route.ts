import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';
import { DocumentService } from '@/lib/services/document.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;

    // Verify application exists and user is the applicant
    const application = await db.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        unit: {
          include: {
            property: {
              include: {
                landlord: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user is the applicant
    if (application.applicantId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only upload documents for your own application' },
        { status: 403 }
      );
    }

    // Get landlord ID - resolve from property if available
    let landlordId = application.unit?.property?.landlord?.id;
    
    // If no landlord via unit, try resolving from propertySlug directly
    if (!landlordId && application.propertySlug) {
      const property = await db.property.findFirst({
        where: { slug: application.propertySlug },
        include: { landlord: { select: { id: true } } },
      });
      landlordId = property?.landlord?.id;
    }

    // If still no landlord, we can't store the document securely
    if (!landlordId) {
      return NextResponse.json(
        { error: 'Unable to associate document with a landlord. Please ensure the property exists.' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const docType = formData.get('docType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!category || !['identity', 'employment'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be "identity" or "employment"' },
        { status: 400 }
      );
    }

    if (!docType) {
      return NextResponse.json(
        { error: 'Document type is required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload document
    const result = await DocumentService.uploadDocument({
      file: buffer,
      fileName: file.name,
      mimeType: file.type,
      applicationId,
      landlordId,
      uploadedById: session.user.id,
      category: category as 'identity' | 'employment',
      docType,
    });

    // Trigger OCR processing asynchronously (don't wait for completion)
    // In production, this should use a job queue (e.g., BullMQ, Inngest)
    const { VerificationProcessorService } = await import('@/lib/services/verification-processor.service');
    VerificationProcessorService.processDocument(result.id).catch((error) => {
      console.error('Background OCR processing failed:', error);
    });

    return NextResponse.json({
      documentId: result.id,
      status: result.verificationStatus,
      message: 'Document uploaded successfully. Processing will begin shortly.',
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    // Handle specific error types
    if (error.message?.includes('exceeds 10MB')) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit. Please upload a smaller file.' },
        { status: 413 }
      );
    }

    if (error.message?.includes('Only JPEG, PNG, and PDF')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, or PDF file.' },
        { status: 400 }
      );
    }

    if (error.message?.includes('authentication failed') || error.message?.includes('Cloudinary')) {
      return NextResponse.json(
        { error: 'Document storage service is temporarily unavailable. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    // Log the actual error for debugging
    console.error('Unhandled upload error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return NextResponse.json(
      { error: error.message || 'Upload failed. Please ensure you are uploading a valid document and try again.' },
      { status: 500 }
    );
  }
}
