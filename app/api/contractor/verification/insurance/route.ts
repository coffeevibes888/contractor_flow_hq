/**
 * Insurance Verification API Endpoint
 * 
 * POST /api/contractor/verification/insurance - Upload insurance certificate
 * GET /api/contractor/verification/insurance - Get insurance verification status
 * 
 * Requirements:
 * - 2.1: Upload insurance certificate and extract expiration date
 * - 2.2: Display "Insured" badge when verified
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { InsuranceVerificationService } from '@/lib/services/insurance-verification';

/**
 * POST /api/contractor/verification/insurance
 * Upload insurance certificate for a contractor
 * 
 * Body: FormData with:
 *   - file: File (insurance certificate PDF/image)
 *   - provider: string (optional)
 *   - coverageAmount: number (optional)
 *   - expirationDate: string (ISO date, optional)
 * 
 * Returns: { success: boolean, result: InsuranceResult, message?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get contractor profile for this user
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const provider = formData.get('provider') as string | null;
    const coverageAmountStr = formData.get('coverageAmount') as string | null;
    const expirationDateStr = formData.get('expirationDate') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          details: 'Insurance certificate file is required'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          details: 'Only PDF, JPEG, and PNG files are allowed'
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'File too large',
          details: 'Maximum file size is 10MB'
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Parse optional metadata
    const metadata: {
      provider?: string;
      coverageAmount?: number;
      expirationDate?: Date;
    } = {};

    if (provider) {
      metadata.provider = provider;
    }

    if (coverageAmountStr) {
      const coverageAmount = parseFloat(coverageAmountStr);
      if (!isNaN(coverageAmount) && coverageAmount > 0) {
        metadata.coverageAmount = coverageAmount;
      }
    }

    if (expirationDateStr) {
      const expirationDate = new Date(expirationDateStr);
      if (!isNaN(expirationDate.getTime())) {
        metadata.expirationDate = expirationDate;
      }
    }

    // Upload certificate
    const result = await InsuranceVerificationService.uploadCertificate(
      contractor.id,
      fileBuffer,
      file.name,
      metadata
    );

    // Determine response message
    let message = '';
    if (result.success) {
      if (result.expirationDate) {
        message = 'Insurance certificate uploaded successfully! Your "Insured" badge is now active.';
      } else {
        message = 'Insurance certificate uploaded successfully! Please add an expiration date to activate your "Insured" badge.';
      }
    } else {
      message = result.error || 'Failed to upload insurance certificate. Please try again.';
    }

    return NextResponse.json({
      success: result.success,
      result: {
        certificateUrl: result.certificateUrl,
        provider: result.provider,
        coverageAmount: result.coverageAmount,
        expirationDate: result.expirationDate,
        uploadedAt: result.uploadedAt,
      },
      message,
    });

  } catch (error) {
    console.error('Insurance certificate upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to upload insurance certificate. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractor/verification/insurance
 * Get current insurance verification status for the authenticated contractor
 * 
 * Returns: { status: InsuranceStatus }
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get contractor profile for this user
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Get insurance status
    const status = await InsuranceVerificationService.getInsuranceStatus(contractor.id);

    return NextResponse.json({
      status,
    });

  } catch (error) {
    console.error('Get insurance status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve insurance status. Please try again later.'
      },
      { status: 500 }
    );
  }
}
