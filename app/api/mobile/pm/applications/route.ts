/**
 * Rental applications — mobile-facing endpoints for the PM showing flow.
 *
 * GET  /api/mobile/pm/applications
 *      List all applications for properties owned by the authed PM's landlord.
 *
 * POST /api/mobile/pm/applications
 *      Create a rental application on behalf of a tenant during an in-person
 *      showing. The PM is collecting the tenant's info on their phone, so we
 *      don't require a tenant session — the landlord is the actor here.
 *
 *      Body: {
 *        unitId, fullName, email, phone?, employmentStatus?, monthlyIncome?,
 *        moveInDate?, notes?, ssn?
 *      }
 *
 *      Returns: { application: { id, status, ... } }
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

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

export async function GET(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    // `archived=true` returns only archived rows; `archived=false` (default)
    // hides them. We always include them in the counts so the tab strip
    // can show "Archived (N)".
    const showArchived = searchParams.get('archived') === 'true';

    const baseWhere = { unit: { property: { landlordId: ctx.landlordId } } };

    const applications = await prisma.rentalApplication.findMany({
      where: {
        ...baseWhere,
        archived: showArchived,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        archived: true,
        createdAt: true,
        fullName: true,
        email: true,
        phone: true,
        employmentStatus: true,
        monthlyIncome: true,
        moveInDate: true,
        notes: true,
        unit: {
          select: {
            id: true,
            name: true,
            rentAmount: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Counts across the whole tab strip — independent of the current filter.
    const counts = await prisma.rentalApplication.groupBy({
      by: ['status'],
      where: { ...baseWhere, archived: false },
      _count: true,
    });
    const archivedCount = await prisma.rentalApplication.count({
      where: { ...baseWhere, archived: true },
    });
    const countsByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

    return NextResponse.json({
      applications: applications.map((a) => ({
        id: a.id,
        status: a.status,
        archived: a.archived,
        createdAt: a.createdAt.toISOString(),
        name: a.fullName?.trim() || 'Unknown',
        email: a.email ?? '',
        phone: a.phone ?? null,
        employmentStatus: a.employmentStatus ?? null,
        monthlyIncome: a.monthlyIncome ? Number(a.monthlyIncome) : null,
        moveInDate: a.moveInDate?.toISOString() ?? null,
        notes: a.notes ?? null,
        propertyId: a.unit?.property?.id ?? null,
        propertyName: a.unit?.property?.name ?? 'Property',
        unitId: a.unit?.id ?? null,
        unitName: a.unit?.name ?? 'Unit',
        unitRent: a.unit?.rentAmount ? Number(a.unit.rentAmount) : null,
      })),
      counts: {
        pending: countsByStatus.pending ?? 0,
        approved: countsByStatus.approved ?? 0,
        rejected: countsByStatus.rejected ?? 0,
        withdrawn: countsByStatus.withdrawn ?? 0,
        archived: archivedCount,
        all:
          (countsByStatus.pending ?? 0) +
          (countsByStatus.approved ?? 0) +
          (countsByStatus.rejected ?? 0) +
          (countsByStatus.withdrawn ?? 0),
      },
    });
  } catch (e: any) {
    console.error('[mobile/pm/applications GET]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      unitId?: string;
      fullName?: string;
      email?: string;
      phone?: string;
      employmentStatus?: string;
      monthlyIncome?: number;
      moveInDate?: string;
      notes?: string;
      ssn?: string;
    };

    if (!body.unitId) return NextResponse.json({ error: 'unitId is required' }, { status: 400 });
    if (!body.fullName?.trim()) return NextResponse.json({ error: 'fullName is required' }, { status: 400 });
    if (!body.email?.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 });

    // Verify the unit belongs to this landlord and is available.
    const unit = await prisma.unit.findFirst({
      where: { id: body.unitId, property: { landlordId: ctx.landlordId, status: { not: 'deleted' } } },
      select: { id: true, isAvailable: true, propertyId: true },
    });
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found in your portfolio' }, { status: 404 });
    }
    if (!unit.isAvailable) {
      return NextResponse.json({ error: 'Unit is not available' }, { status: 400 });
    }

    // Best-effort SSN encryption — we never store plain text. Same approach
    // the website uses (AES-256-GCM keyed off APP_ENCRYPTION_KEY).
    let encryptedSsn: string | null = null;
    if (body.ssn) {
      const key = process.env.APP_ENCRYPTION_KEY;
      if (key && key.length >= 32) {
        try {
          const iv = crypto.randomBytes(12);
          const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key.slice(0, 32)), iv);
          const enc = Buffer.concat([cipher.update(body.ssn, 'utf8'), cipher.final()]);
          const tag = cipher.getAuthTag();
          encryptedSsn = `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
        } catch {
          encryptedSsn = null;
        }
      }
    }

    const application = await prisma.rentalApplication.create({
      data: {
        unitId: unit.id,
        fullName: body.fullName.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        employmentStatus: body.employmentStatus?.trim() || null,
        monthlyIncome: typeof body.monthlyIncome === 'number' ? body.monthlyIncome : null,
        moveInDate: body.moveInDate ? new Date(body.moveInDate) : null,
        notes: body.notes?.trim() || null,
        encryptedSsn,
        status: 'pending',
      },
    });

    return NextResponse.json({
      application: {
        id: application.id,
        status: application.status,
        unitId: application.unitId,
      },
    });
  } catch (e: any) {
    console.error('[mobile/pm/applications POST]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
