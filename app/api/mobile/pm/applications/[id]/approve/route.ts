/**
 * POST /api/mobile/pm/applications/:id/approve
 *
 * Mobile-token equivalent of /api/applications/:id/approve. Reuses the same
 * `approveApplication` service so behavior stays identical to the website:
 *   - Generates the lease record with status `pending_signature`
 *   - Creates the LegalDocument and uploads the rendered PDF
 *   - Creates a `DocumentSignatureRequest` with a token (used by mobile + web)
 *   - Marks the unit unavailable
 *
 * Body: { unitId, leaseStartDate, leaseEndDate?, rentAmount?, billingDayOfMonth? }
 * Returns: { success, application, lease, signingUrl, signingToken }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import {
  approveApplication,
  ApprovalError,
  ApprovalErrorCodes,
} from '@/lib/services/application-approval.service';

function statusFor(code: string): number {
  switch (code) {
    case ApprovalErrorCodes.APPLICATION_NOT_FOUND:
      return 404;
    case ApprovalErrorCodes.APPLICATION_NOT_PENDING:
    case ApprovalErrorCodes.UNIT_UNAVAILABLE:
    case ApprovalErrorCodes.NO_LEASE_TEMPLATE:
    case ApprovalErrorCodes.VALIDATION_ERROR:
      return 400;
    default:
      return 500;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const { id: applicationId } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      unitId?: string;
      leaseStartDate?: string;
      leaseEndDate?: string | null;
      rentAmount?: number;
      billingDayOfMonth?: number;
    };

    if (!body.unitId) return NextResponse.json({ error: 'unitId is required' }, { status: 400 });
    if (!body.leaseStartDate) {
      return NextResponse.json({ error: 'leaseStartDate is required' }, { status: 400 });
    }

    const startDate = new Date(body.leaseStartDate);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid leaseStartDate' }, { status: 400 });
    }
    let endDate: Date | null = null;
    if (body.leaseEndDate) {
      endDate = new Date(body.leaseEndDate);
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid leaseEndDate' }, { status: 400 });
      }
    }

    const result = await approveApplication({
      applicationId,
      unitId: body.unitId,
      leaseStartDate: startDate,
      leaseEndDate: endDate,
      rentAmount: typeof body.rentAmount === 'number' ? body.rentAmount : undefined,
      billingDayOfMonth:
        typeof body.billingDayOfMonth === 'number' ? body.billingDayOfMonth : undefined,
      landlordId: landlord.id,
    });

    return NextResponse.json(result);
  } catch (e: any) {
    if (e instanceof ApprovalError) {
      return NextResponse.json(
        { success: false, message: e.message, code: e.code },
        { status: statusFor(e.code) },
      );
    }
    console.error('[mobile/pm/applications/:id/approve]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
