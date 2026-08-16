/**
 * Contractor CRM Lead Notes API
 * 
 * POST /api/contractor/crm/leads/[id]/notes - Add note to lead
 * 
 * Requirements: 7.3
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ContractorCRMService } from '@/lib/services/contractor-crm';

/**
 * POST /api/contractor/crm/leads/[id]/notes
 * Add a note to a lead
 * 
 * Body: { text: string }
 * Returns: { success: boolean, message: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { text } = body;

    // Validate note text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid note',
          details: 'Note text is required and must be a non-empty string'
        },
        { status: 400 }
      );
    }

    // Add note
    await ContractorCRMService.addNote(
      params.id,
      text.trim(),
      session.user.id,
      contractor.id
    );

    return NextResponse.json({
      success: true,
      message: 'Note added successfully',
    });

  } catch (error: any) {
    console.error('Add note error:', error);
    
    if (error.message === 'Lead not found or access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to add note. Please try again later.'
      },
      { status: 500 }
    );
  }
}
