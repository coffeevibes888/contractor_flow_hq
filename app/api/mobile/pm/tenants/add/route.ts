/**
 * POST /api/mobile/pm/tenants/add
 *
 * Mobile mirror of the website's /admin/tenants/add server action
 * (`addTenantToProperty` in `lib/actions/tenant.actions.ts`). Same
 * validation (`addTenantSchema`), same Prisma writes — just with
 * mobile-token auth so the app can manually add a tenant + create a
 * pending lease in one call.
 *
 * Body shape mirrors `AddTenantInput`:
 *   {
 *     firstName, lastName, email, phone?,
 *     propertyId, unitId,
 *     rentAmount, securityDeposit?,
 *     leaseStartDate, leaseEndDate?, billingDayOfMonth,
 *     moveInDate?, emergencyContactName?, emergencyContactPhone?,
 *     numberOfOccupants, hasPets, petDetails?,
 *     vehicleInfo?, notes?,
 *     sendInviteEmail, createLeaseImmediately,
 *   }
 *
 * GET /api/mobile/pm/tenants/add — returns the same property+units list
 * the website's add-tenant page uses to populate its dropdowns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import { hash } from '@/lib/encrypt';
import { addTenantSchema } from '@/lib/validators';

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

    const properties = await prisma.property.findMany({
      where: { landlordId: ctx.landlordId, status: { not: 'deleted' } },
      select: {
        id: true,
        name: true,
        address: true,
        units: {
          select: {
            id: true,
            name: true,
            type: true,
            rentAmount: true,
            isAvailable: true,
            bedrooms: true,
            bathrooms: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      properties: properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        units: p.units.map((u) => ({
          id: u.id,
          name: u.name,
          type: u.type,
          rentAmount: Number(u.rentAmount),
          isAvailable: u.isAvailable,
          bedrooms: u.bedrooms ?? null,
          bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
        })),
      })),
    });
  } catch (error: any) {
    console.error('[mobile/pm/tenants/add GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const raw = await req.json().catch(() => ({}));
    let validated;
    try {
      validated = addTenantSchema.parse(raw);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: e.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
      }
      throw e;
    }

    // Verify the property belongs to this landlord.
    const property = await prisma.property.findFirst({
      where: { id: validated.propertyId, landlordId: ctx.landlordId, status: { not: 'deleted' } },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Verify the unit belongs to that property.
    const unit = await prisma.unit.findFirst({
      where: { id: validated.unitId, propertyId: validated.propertyId },
      select: { id: true },
    });
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found in this property' }, { status: 404 });
    }

    // Bail if the unit is already leased.
    const existingLease = await prisma.lease.findFirst({
      where: {
        unitId: validated.unitId,
        status: { in: ['active', 'pending', 'pending_signature'] },
      },
      select: { id: true },
    });
    if (existingLease) {
      return NextResponse.json({ error: 'This unit already has an active lease' }, { status: 409 });
    }

    // Get-or-create the tenant user record.
    let tenant = await prisma.user.findUnique({ where: { email: validated.email } });
    const fullName = `${validated.firstName} ${validated.lastName}`.trim();
    const tempPassword = randomUUID().slice(0, 12);
    if (!tenant) {
      tenant = await prisma.user.create({
        data: {
          name: fullName,
          email: validated.email,
          phoneNumber: validated.phone || null,
          password: await hash(tempPassword),
          role: 'user',
          emailVerified: null,
        },
      });
    }

    let lease: { id: string } | null = null;
    if (validated.createLeaseImmediately) {
      lease = await prisma.lease.create({
        data: {
          unitId: validated.unitId,
          tenantId: tenant.id,
          startDate: new Date(validated.leaseStartDate),
          endDate: validated.leaseEndDate ? new Date(validated.leaseEndDate) : null,
          rentAmount: validated.rentAmount,
          billingDayOfMonth: validated.billingDayOfMonth,
          status: 'pending',
        },
        select: { id: true },
      });

      await prisma.unit.update({
        where: { id: validated.unitId },
        data: { isAvailable: false },
      });
    }

    // TODO mirror the website's invite-email side effect when
    // sendInviteEmail is true. For now we leave the user record
    // ready and the website's existing invite path can pick it up.

    return NextResponse.json({
      success: true,
      message: `Tenant ${fullName} added${lease ? ' with lease created' : ''}`,
      tenantId: tenant.id,
      leaseId: lease?.id ?? null,
    });
  } catch (error: any) {
    console.error('[mobile/pm/tenants/add POST]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not add tenant' }, { status: 500 });
  }
}
