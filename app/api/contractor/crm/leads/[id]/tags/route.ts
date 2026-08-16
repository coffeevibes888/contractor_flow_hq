/**
 * Contractor CRM Lead Tags API
 * 
 * POST /api/contractor/crm/leads/[id]/tags - Add tag to lead
 * DELETE /api/contractor/crm/leads/[id]/tags - Remove tag from lead
 * 
 * Requirements: 7.3
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ContractorCRMService } from '@/lib/services/contractor-crm';

/**
 * POST /api/contractor/crm/leads/[id]/tags
 * Add a tag to a lead
 * 
 * Body: { tag: string }
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
    const { tag } = body;

    // Validate tag
    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid tag',
          details: 'Tag is required and must be a non-empty string'
        },
        { status: 400 }
      );
    }

    // Add tag
    await ContractorCRMService.addTag(
      params.id,
      tag.trim(),
      contractor.id
    );

    return NextResponse.json({
      success: true,
      message: 'Tag added successfully',
    });

  } catch (error: any) {
    console.error('Add tag error:', error);
    
    if (error.message === 'Lead not found or access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to add tag. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contractor/crm/leads/[id]/tags
 * Remove a tag from a lead
 * 
 * Body: { tag: string }
 * Returns: { success: boolean, message: string }
 */
export async function DELETE(
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
    const { tag } = body;

    // Validate tag
    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid tag',
          details: 'Tag is required and must be a non-empty string'
        },
        { status: 400 }
      );
    }

    // Remove tag
    await ContractorCRMService.removeTag(
      params.id,
      tag.trim(),
      contractor.id
    );

    return NextResponse.json({
      success: true,
      message: 'Tag removed successfully',
    });

  } catch (error: any) {
    console.error('Remove tag error:', error);
    
    if (error.message === 'Lead not found or access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to remove tag. Please try again later.'
      },
      { status: 500 }
    );
  }
}
