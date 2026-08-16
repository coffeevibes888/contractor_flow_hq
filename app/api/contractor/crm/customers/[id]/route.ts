/**
 * Contractor CRM Customer Detail API
 * 
 * GET /api/contractor/crm/customers/[id] - Get customer details with history
 * 
 * Requirements: 7.3, 7.4
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ContractorCRMService } from '@/lib/services/contractor-crm';

/**
 * GET /api/contractor/crm/customers/[id]
 * Get customer details including communication history
 * 
 * Returns: { success: boolean, customer: Customer, communicationHistory: Message[] }
 */
export async function GET(
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

    // Get customer details
    const customer = await ContractorCRMService.getCustomer(
      params.id,
      contractor.id
    );

    // Get communication history
    const communicationHistory = await ContractorCRMService.getCommunicationHistory(
      params.id,
      contractor.id
    );

    return NextResponse.json({
      success: true,
      customer,
      communicationHistory,
    });

  } catch (error: any) {
    console.error('Get customer details error:', error);
    
    if (error.message === 'Customer not found or access denied') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve customer details. Please try again later.'
      },
      { status: 500 }
    );
  }
}
