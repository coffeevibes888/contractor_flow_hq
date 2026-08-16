/**
 * Contractor CRM Leads API
 * 
 * GET /api/contractor/crm/leads - Get all leads with filters
 * 
 * Requirements: 7.1-7.7
 */

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ContractorCRMService, LeadFilters, LeadStatus } from '@/lib/services/contractor-crm';
import { canAccessFeature } from '@/lib/services/contractor-feature-gate';

/**
 * GET /api/contractor/crm/leads
 * Get all leads for the authenticated contractor with optional filters
 * 
 * Query params:
 * - status: comma-separated list of statuses (new,contacted,quoted,negotiating,won,lost)
 * - startDate: ISO date string for date range start
 * - endDate: ISO date string for date range end
 * - serviceType: filter by service type
 * - search: search by name, email, or phone
 * 
 * Returns: { success: boolean, leads: Lead[] }
 * 
 * Feature Gate: Requires 'crm' feature (Pro or Enterprise tier)
 */
export async function GET(req: NextRequest) {
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

    // Check CRM feature access
    const featureAccess = await canAccessFeature(contractor.id, 'crm');
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { 
          error: 'Feature locked',
          message: featureAccess.reason || 'CRM features require Pro plan or higher',
          requiredTier: 'pro',
          currentTier: featureAccess.tier,
          feature: 'crm'
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    
    const filters: LeadFilters = {};

    // Parse status filter
    const statusParam = searchParams.get('status');
    if (statusParam) {
      filters.status = statusParam.split(',') as LeadStatus[];
    }

    // Parse date range filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    // Parse service type filter
    const serviceType = searchParams.get('serviceType');
    if (serviceType) {
      filters.serviceType = serviceType;
    }

    // Parse search filter
    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    // Get leads from CRM service
    const leads = await ContractorCRMService.getLeads(contractor.id, filters);

    return NextResponse.json({
      success: true,
      leads,
    });

  } catch (error) {
    console.error('Get leads error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve leads. Please try again later.'
      },
      { status: 500 }
    );
  }
}
