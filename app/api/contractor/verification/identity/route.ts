/**
 * Identity Verification API Endpoint
 * 
 * POST /api/contractor/verification/identity - Initiate identity verification
 * GET /api/contractor/verification/identity - Get identity verification status
 * 
 * Requirements:
 * - 4.1: Initiate identity verification with Persona (collect government ID and selfie)
 * - 4.2: Display "Identity Verified" badge when verification passes
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { IdentityVerificationService } from '@/lib/services/identity-verification';

/**
 * POST /api/contractor/verification/identity
 * Initiate identity verification for the authenticated contractor
 * 
 * Returns: { success: boolean, inquiry: PersonaInquiry, message: string }
 */
export async function POST() {
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
      select: { 
        id: true,
        identityVerificationId: true,
        identityVerifiedAt: true,
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Check if identity is already verified
    if (contractor.identityVerifiedAt) {
      return NextResponse.json(
        { 
          error: 'Identity already verified',
          message: 'Your identity was verified on ' + 
                   contractor.identityVerifiedAt.toLocaleDateString(),
        },
        { status: 400 }
      );
    }

    // Check if there's a pending inquiry
    if (contractor.identityVerificationId) {
      // Get current status
      const status = await IdentityVerificationService.getVerificationStatus(contractor.id);
      
      if (status.status === 'pending') {
        return NextResponse.json(
          { 
            error: 'Verification in progress',
            message: 'You already have a pending identity verification. Please complete it or wait for it to expire.',
            inquiryId: status.inquiryId,
          },
          { status: 400 }
        );
      }
    }

    // Create new identity verification inquiry with Persona
    const inquiry = await IdentityVerificationService.createInquiry(contractor.id);

    return NextResponse.json({
      success: true,
      inquiry: {
        inquiryId: inquiry.inquiryId,
        sessionToken: inquiry.sessionToken,
        inquiryUrl: inquiry.inquiryUrl,
        expiresAt: inquiry.expiresAt,
      },
      message: 'Identity verification initiated successfully. Please complete the verification process.',
    });

  } catch (error) {
    console.error('Identity verification initiation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to initiate identity verification. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractor/verification/identity
 * Get current identity verification status for the authenticated contractor
 * 
 * Returns: { status: IdentityStatus }
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

    // Get identity verification status
    const status = await IdentityVerificationService.getVerificationStatus(contractor.id);

    return NextResponse.json({
      status,
    });

  } catch (error) {
    console.error('Get identity verification status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve identity verification status. Please try again later.'
      },
      { status: 500 }
    );
  }
}
