/**
 * Contractor CRM Lead Detail API
 * 
 * PATCH /api/contractor/crm/leads/[id] - Update lead status
 * POST /api/contractor/crm/leads/[id]/notes - Add note to lead
 * POST /api/contractor/crm/leads/[id]/tags - Add tag to lead
 * DELETE /api/contractor/crm/leads/[id]/tags - Remove tag from lead
 * 
 * Requirements: 7.1-7.7
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ContractorCRMService, LeadStatus } from '@/lib/services/contractor-crm';

/**
 * PATCH /api/contractor/crm/leads/[id]
 * Update lead status
 * 
 * Body: { status: LeadStatus }
 * Returns: { success: boolean, customer: Customer }
 */
export async function PATCH(
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
    const { status } = body;

    // Validate status
    const validStatuses: LeadStatus[] = ['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status',
          details: `Status must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Update lead status
    const customer = await ContractorCRMService.updateLeadStatus(
      params.id,
      status,
      contractor.id
    );

    return NextResponse.json({
      success: true,
      customer,
      message: `Lead status updated to ${status}`,
    });

  } catch (error: any) {
    console.error('Update lead status error:', error);
    
    if (error.message === 'Lead not found or access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to update lead status. Please try again later.'
      },
      { status: 500 }
    );
  }
}
