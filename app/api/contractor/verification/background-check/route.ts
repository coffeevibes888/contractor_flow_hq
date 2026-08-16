/**
 * Background Check API Endpoint
 * 
 * POST /api/contractor/verification/background-check - Initiate background check
 * GET /api/contractor/verification/background-check - Get background check status
 * 
 * Requirements:
 * - 3.1: Initiate background check with Checkr
 * - 3.2: Display "Background Checked" badge when check passes
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { BackgroundCheckService, CandidateData } from '@/lib/services/background-check';

/**
 * POST /api/contractor/verification/background-check
 * Initiate a background check for the authenticated contractor
 * 
 * Body: { firstName: string, lastName: string, email: string, phone?: string, dob?: string, ssn?: string, zipcode?: string }
 * Returns: { success: boolean, invitation: CheckrInvitation, message: string }
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
      select: { 
        id: true,
        backgroundCheckId: true,
        backgroundCheckDate: true,
        backgroundCheckExpires: true,
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Check if there's already an active background check
    if (contractor.backgroundCheckId && contractor.backgroundCheckDate) {
      const now = new Date();
      if (contractor.backgroundCheckExpires && contractor.backgroundCheckExpires > now) {
        return NextResponse.json(
          { 
            error: 'Active background check exists',
            message: 'You already have a valid background check. It will expire on ' + 
                     contractor.backgroundCheckExpires.toLocaleDateString(),
          },
          { status: 400 }
        );
      }
    }

    // Parse request body
    const body = await req.json();
    const candidateData: CandidateData = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      dob: body.dob,
      ssn: body.ssn,
      zipcode: body.zipcode,
    };

    // Validate required fields
    if (!candidateData.firstName || !candidateData.lastName || !candidateData.email) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'firstName, lastName, and email are required'
        },
        { status: 400 }
      );
    }

    // Initiate background check with Checkr
    const invitation = await BackgroundCheckService.initiateCheck(
      contractor.id,
      candidateData
    );

    return NextResponse.json({
      success: true,
      invitation: {
        invitationUrl: invitation.invitationUrl,
        candidateId: invitation.candidateId,
        expiresAt: invitation.expiresAt,
      },
      message: 'Background check initiated successfully. Please complete the verification at the provided URL.',
    });

  } catch (error) {
    console.error('Background check initiation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to initiate background check. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contractor/verification/background-check
 * Get current background check status for the authenticated contractor
 * 
 * Returns: { status: BackgroundCheckStatus }
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

    // Get background check status
    const status = await BackgroundCheckService.getCheckStatus(contractor.id);

    return NextResponse.json({
      status,
    });

  } catch (error) {
    console.error('Get background check status error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve background check status. Please try again later.'
      },
      { status: 500 }
    );
  }
}
