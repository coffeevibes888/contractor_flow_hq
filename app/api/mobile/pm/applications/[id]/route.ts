/**
 * GET   /api/mobile/pm/applications/:id
 * PATCH /api/mobile/pm/applications/:id
 *
 * GET returns the full application detail used by the mobile review screen
 * (everything the website's `/admin/applications/[id]` page shows: applicant
 * identity, parsed notes, income/rent qualification math, screening status,
 * verification documents, etc.).
 *
 * PATCH updates editable fields:
 *   - status         → 'pending' | 'approved' | 'rejected' | 'withdrawn'
 *   - archived       → boolean
 *   - adminResponse  → string (message back to the applicant)
 *   - screeningProvider, screeningStatus
 * Any of these can be set independently. Status changes also fire the
 * existing notification to the applicant via NotificationService — same
 * code the website uses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import { NotificationService } from '@/lib/services/notification-service';

async function ctxFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true },
  });
  return landlord ? { landlordId: landlord.id, userId: payload.userId } : null;
}

// Parse the freeform `notes` blob (key: value\n…) the website's wizard
// stores. Same shape as the website detail page.
function parseNotes(notes: string | null): Record<string, string> {
  if (!notes) return {};
  const data: Record<string, string> = {};
  notes.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(': ');
    if (key && valueParts.length > 0) {
      data[key.trim()] = valueParts.join(': ').trim();
    }
  });
  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const app = await prisma.rentalApplication.findFirst({
      where: { id, unit: { property: { landlordId: ctx.landlordId } } },
      include: {
        applicant: { select: { id: true, name: true, email: true, image: true } },
        unit: {
          select: {
            id: true,
            name: true,
            type: true,
            rentAmount: true,
            property: { select: { id: true, name: true } },
          },
        },
        verification: true,
        verificationDocuments: {
          select: {
            id: true,
            category: true,
            docType: true,
            originalFileName: true,
            verificationStatus: true,
            cloudinarySecureUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = parseNotes(app.notes);
    const monthlyIncome =
      app.monthlyIncome != null
        ? Number(app.monthlyIncome)
        : app.verification?.monthlyIncome != null
        ? Number(app.verification.monthlyIncome)
        : null;
    const rentAmount = app.unit?.rentAmount != null ? Number(app.unit.rentAmount) : null;
    const incomeToRent = monthlyIncome && rentAmount ? monthlyIncome / rentAmount : null;

    return NextResponse.json({
      id: app.id,
      status: app.status,
      archived: app.archived,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      adminResponse: app.adminResponse,

      // Identity
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      moveInDate: app.moveInDate,
      employmentStatus: app.employmentStatus,
      applicant: app.applicant,
      hasSsn: !!app.encryptedSsn, // never expose decrypted SSN over mobile

      // Property
      unit: app.unit,
      property: app.unit?.property ?? null,

      // Income math
      income: {
        monthly: monthlyIncome,
        yearly: monthlyIncome ? monthlyIncome * 12 : null,
        rent: rentAmount,
        ratio: incomeToRent,
        qualifies: incomeToRent != null ? incomeToRent >= 3 : null,
      },

      // Screening
      screening: {
        provider: app.screeningProvider,
        bundle: app.screeningBundle,
        status: app.screeningStatus,
        reportUrl: app.screeningReportUrl,
        requestedAt: app.screeningRequestedAt,
        completedAt: app.screeningCompletedAt,
      },

      // Documents
      documents: app.verificationDocuments,

      // Parsed wizard fields — same keys the website's detail page reads
      details: parsed,
    });
  } catch (e: any) {
    console.error('[mobile/pm/applications/:id GET]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const body = (await req.json().catch(() => ({}))) as {
      status?: 'pending' | 'approved' | 'rejected' | 'withdrawn';
      archived?: boolean;
      adminResponse?: string;
      screeningProvider?: string;
      screeningStatus?: 'requested' | 'in_progress' | 'complete' | 'failed';
      /** Approve-specific. If omitted, the unit on the application is used. */
      unitId?: string;
      leaseStartDate?: string; // ISO
      leaseEndDate?: string | null; // ISO or null = month-to-month
      rentAmount?: number;
      billingDayOfMonth?: number;
    };

    const existing = await prisma.rentalApplication.findFirst({
      where: { id, unit: { property: { landlordId: ctx.landlordId } } },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            rentAmount: true,
            property: { select: { id: true, name: true } },
          },
        },
        applicant: { select: { id: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // ── Approval ── delegate to the website's full approval pipeline so
    // the mobile flow runs the same lease generation, signing email,
    // rent-reminder scheduling, and notifications the dashboard does.
    if (body.status === 'approved' && existing.status !== 'approved') {
      const { approveApplication, ApprovalError } = await import(
        '@/lib/services/application-approval.service'
      );

      const targetUnitId = body.unitId ?? existing.unitId ?? existing.unit?.id;
      if (!targetUnitId) {
        return NextResponse.json({ error: 'No unit on this application' }, { status: 400 });
      }

      const startDate = body.leaseStartDate ? new Date(body.leaseStartDate) : new Date();
      const endDate =
        body.leaseEndDate === undefined
          ? null // month-to-month by default — same default as web
          : body.leaseEndDate === null
          ? null
          : new Date(body.leaseEndDate);

      try {
        const result = await approveApplication({
          applicationId: id,
          unitId: targetUnitId,
          leaseStartDate: startDate,
          leaseEndDate: endDate,
          rentAmount: body.rentAmount,
          billingDayOfMonth: body.billingDayOfMonth ?? 1,
          landlordId: ctx.landlordId,
        });

        // If the PM also changed unrelated fields in the same call (admin
        // response, archive, screening), apply them on top of the approval.
        const sideUpdates: Record<string, unknown> = {};
        if (typeof body.adminResponse === 'string' && body.adminResponse.trim()) {
          sideUpdates.adminResponse = body.adminResponse.trim();
        }
        if (typeof body.archived === 'boolean' && body.archived !== existing.archived) {
          sideUpdates.archived = body.archived;
          sideUpdates.archivedAt = body.archived ? new Date() : null;
        }
        if (typeof body.screeningProvider === 'string') {
          sideUpdates.screeningProvider = body.screeningProvider || null;
        }
        if (typeof body.screeningStatus === 'string') {
          sideUpdates.screeningStatus = body.screeningStatus;
        }
        if (Object.keys(sideUpdates).length > 0) {
          await prisma.rentalApplication.update({
            where: { id },
            data: sideUpdates,
          });
        }

        return NextResponse.json({
          success: true,
          approved: true,
          lease: result.lease,
          signingUrl: result.signingUrl,
          signingToken: result.signingToken,
        });
      } catch (e: any) {
        if (e instanceof ApprovalError) {
          // Surface a friendly status by error code so the mobile UI can
          // explain why approval failed (e.g. NO_LEASE_TEMPLATE).
          const codeStatusMap: Record<string, number> = {
            NO_LEASE_TEMPLATE: 412, // Precondition Required
            UNIT_UNAVAILABLE: 409,
            APPLICATION_NOT_PENDING: 409,
            APPLICATION_NOT_FOUND: 404,
            PROPERTY_NOT_FOUND: 404,
            TENANT_NOT_FOUND: 404,
            VALIDATION_ERROR: 403,
            LEASE_GENERATION_FAILED: 500,
          };
          return NextResponse.json(
            { error: e.message, code: e.code },
            { status: codeStatusMap[e.code] ?? 400 },
          );
        }
        console.error('[mobile/pm/applications/:id approve]', e);
        return NextResponse.json(
          { error: e?.message ?? 'Could not approve application' },
          { status: 500 },
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.status && body.status !== existing.status) updates.status = body.status;
    if (typeof body.archived === 'boolean' && body.archived !== existing.archived) {
      updates.archived = body.archived;
      updates.archivedAt = body.archived ? new Date() : null;
    }
    if (typeof body.adminResponse === 'string') {
      // Append to notes the same way the website does so the audit trail
      // stays single-source.
      const trimmed = body.adminResponse.trim();
      if (trimmed) {
        updates.adminResponse = trimmed;
        updates.notes = existing.notes
          ? `${existing.notes}\n\nAdmin response: ${trimmed}`
          : `Admin response: ${trimmed}`;
      }
    }
    if (typeof body.screeningProvider === 'string') {
      updates.screeningProvider = body.screeningProvider || null;
    }
    if (typeof body.screeningStatus === 'string') {
      updates.screeningStatus = body.screeningStatus;
      if (body.screeningStatus === 'requested' || body.screeningStatus === 'in_progress') {
        updates.screeningRequestedAt = existing.screeningRequestedAt ?? new Date();
      }
      if (body.screeningStatus === 'complete' || body.screeningStatus === 'failed') {
        updates.screeningCompletedAt = new Date();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ application: existing });
    }

    const application = await prisma.rentalApplication.update({
      where: { id: existing.id },
      data: updates,
    });

    // Notify the applicant on a status change (same path the website uses).
    // We deliberately do NOT notify on archive — archiving is internal.
    if (
      body.status &&
      body.status !== existing.status &&
      existing.applicant?.id
    ) {
      const propertyLabel = existing.unit?.property?.name
        ? `${existing.unit.property.name}${existing.unit?.name ? ` - ${existing.unit.name}` : ''}`
        : 'your application';
      const titleByStatus: Record<string, string> = {
        approved: 'Application approved',
        rejected: 'Application update',
        withdrawn: 'Application withdrawn',
        pending: 'Application reopened',
      };
      const messageByStatus: Record<string, string> = {
        approved: `Great news! Your application for ${propertyLabel} has been approved.${
          body.adminResponse ? ` Note from the landlord: ${body.adminResponse}` : ''
        }`,
        rejected: `Your application for ${propertyLabel} wasn't selected.${
          body.adminResponse ? ` Note: ${body.adminResponse}` : ''
        }`,
        withdrawn: `Your application for ${propertyLabel} was marked withdrawn.`,
        pending: `Your application for ${propertyLabel} is being reviewed again.`,
      };
      try {
        await NotificationService.createNotification({
          userId: existing.applicant.id,
          type: 'application',
          title: titleByStatus[body.status] ?? 'Application update',
          message: messageByStatus[body.status] ?? '',
          actionUrl: `/user/applications/${existing.id}`,
          metadata: { applicationId: existing.id, status: body.status },
          landlordId: ctx.landlordId,
        });
      } catch (err) {
        console.error('[mobile/pm/applications/:id PATCH] notify failed', err);
      }
    }

    return NextResponse.json({ success: true, application });
  } catch (e: any) {
    console.error('[mobile/pm/applications/:id PATCH]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
