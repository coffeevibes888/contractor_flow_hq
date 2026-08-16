/**
 * License Verification API Endpoint
 * 
 * POST /api/contractor/verification/license - Verify contractor license
 * GET /api/contractor/verification/license - Get license verification status
 * 
 * Requirements:
 * - 1.1: Query state licensing database API to validate license
 * - 1.2: Display "Licensed" badge when verified
 * - 1.3: Notify contractor when license is expired or invalid
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { LicenseVerificationService } from '@/lib/services/license-verification';

/**
 * POST /api/contractor/verification/license
 * Verify a contractor's license with state licensing board
 * 
 * Body: { licenseNumber: string, state: string, type: string }
 * Returns: { success: boolean, result: LicenseResult, message?: string }
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

    // Parse request body
    const body = await req.json();
    const { licenseNumber, state, type } = body;

    // Validate required fields
    if (!licenseNumber || !state || !type) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'licenseNumber, state, and type are required'
        },
        { status: 400 }
      );
    }

    // Verify license with state API
    const result = await LicenseVerificationService.verifyLicense(
      licenseNumber,
      state,
      type
    );

    // Update contractor profile with verification results
    await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        licenseNumber,
        licenseState: state.toUpperCase(),
        licenseVerifiedAt: result.isValid ? result.verifiedAt : null,
        licenseExpiresAt: result.expirationDate,
        licenseVerificationData: result.rawResponse || {},
      },
    });

    // Determine response message based on result
    let message = '';
    if (result.isValid && result.status === 'active') {
      message = 'License verified successfully! Your "Licensed" badge is now active.';
    } else if (result.status === 'expired') {
      message = 'License verification failed: License has expired. Please renew your license.';
    } else if (result.status === 'suspended') {
      message = 'License verification failed: License is suspended.';
    } else if (result.status === 'revoked') {
      message = 'License verification failed: License has been revoked.';
    } else if (result.status === 'not_found') {
      const rawResponse = result.rawResponse as { message?: string; retryable?: boolean } | undefined;
      if (rawResponse?.retryable) {
        message = 'License verification is temporarily unavailable. Please try again later.';
      } else {
        message = 'License not found. Please verify your license number and state are correct.';
      }
    }

    return NextResponse.json({
      success: result.isValid,
      result: {
        isValid: result.isValid,
        status: result.status,
        expirationDate: result.expirationDate,
        licenseType: result.licenseType,
        holderName: result.holderName,
        verifiedAt: result.verifiedAt,
      },
      message,
    });

  } catch (error) {
    console.error('License verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to verify license. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractor/verification/license
 * Get current license verification status for the authenticated contractor
 * 
 * Returns: { status: LicenseStatus }
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

    // Get license status
    const status = await LicenseVerificationService.getLicenseStatus(contractor.id);

    return NextResponse.json({
      status,
    });

  } catch (error) {
    console.error('Get license status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve license status. Please try again later.'
      },
      { status: 500 }
    );
  }
}
