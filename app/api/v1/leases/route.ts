/**
 * External API - Leases Endpoint
 * 
 * GET /api/v1/leases - List all leases
 * POST /api/v1/leases - Create a new lease
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import {
  withApiAuth,
  apiSuccess,
  apiPaginated,
  apiError,
  parsePagination,
  parseSort,
  ApiContext,
} from '@/lib/api/middleware';
import { hasScope } from '@/lib/services/api-key.service';
import { triggerWebhook } from '@/lib/services/webhook.service';

// GET /api/v1/leases
export const GET = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'leases:read')) {
      return apiError('Missing required scope: leases:read', 403, 'insufficient_scope');
    }

    const { page, limit, offset } = parsePagination(req);
    const { field, order } = parseSort(req, ['startDate', 'endDate', 'createdAt', 'rentAmount'], 'createdAt');

    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId');
    const unitId = url.searchParams.get('unitId');
    const status = url.searchParams.get('status');
    const tenantId = url.searchParams.get('tenantId');

    const where: any = {
      unit: {
        property: {
          landlordId: ctx.landlordId,
          deletedAt: null,
        },
      },
    };

    if (propertyId) where.unit = { ...where.unit, propertyId };
    if (unitId) where.unitId = unitId;
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId;

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        select: {
          id: true,
          unitId: true,
          tenantId: true,
          startDate: true,
          endDate: true,
          rentAmount: true,
          billingDayOfMonth: true,
          status: true,
          terminationReason: true,
          terminatedAt: true,
          tenantSignedAt: true,
          landlordSignedAt: true,
          createdAt: true,
          updatedAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          unit: {
            select: {
              id: true,
              name: true,
              property: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { [field]: order },
        take: limit,
        skip: offset,
      }),
      prisma.lease.count({ where }),
    ]);

    const formattedLeases = leases.map(lease => ({
      id: lease.id,
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate?.toISOString() || null,
      rentAmount: Number(lease.rentAmount),
      billingDayOfMonth: lease.billingDayOfMonth,
      status: lease.status,
      terminationReason: lease.terminationReason,
      terminatedAt: lease.terminatedAt?.toISOString() || null,
      tenantSignedAt: lease.tenantSignedAt?.toISOString() || null,
      landlordSignedAt: lease.landlordSignedAt?.toISOString() || null,
      tenant: {
        id: lease.tenant.id,
        name: lease.tenant.name,
        email: lease.tenant.email,
      },
      unit: {
        id: lease.unit.id,
        name: lease.unit.name,
      },
      property: {
        id: lease.unit.property.id,
        name: lease.unit.property.name,
      },
      createdAt: lease.createdAt.toISOString(),
      updatedAt: lease.updatedAt.toISOString(),
    }));

    return apiPaginated(formattedLeases, total, page, limit);
  },
  ['leases:read']
);

// POST /api/v1/leases
export const POST = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'leases:write')) {
      return apiError('Missing required scope: leases:write', 403, 'insufficient_scope');
    }

    const body = await req.json();

    // Validate required fields
    if (!body.unitId) {
      return apiError('Unit ID is required', 400, 'validation_error');
    }

    if (!body.tenantId) {
      return apiError('Tenant ID is required', 400, 'validation_error');
    }

    if (!body.startDate) {
      return apiError('Start date is required', 400, 'validation_error');
    }

    if (body.rentAmount === undefined || body.rentAmount === null) {
      return apiError('Rent amount is required', 400, 'validation_error');
    }

    // Verify unit belongs to landlord
    const unit = await prisma.unit.findFirst({
      where: {
        id: body.unitId,
        property: {
          landlordId: ctx.landlordId,
          deletedAt: null,
        },
      },
      include: {
        property: true,
      },
    });

    if (!unit) {
      return apiError('Unit not found', 404, 'not_found');
    }

    // Verify tenant exists
    const tenant = await prisma.user.findUnique({
      where: { id: body.tenantId },
    });

    if (!tenant) {
      return apiError('Tenant not found', 404, 'not_found');
    }

    // Check for existing active lease on this unit
    const existingLease = await prisma.lease.findFirst({
      where: {
        unitId: body.unitId,
        status: 'active',
      },
    });

    if (existingLease) {
      return apiError('Unit already has an active lease', 400, 'lease_exists');
    }

    const lease = await prisma.lease.create({
      data: {
        unitId: body.unitId,
        tenantId: body.tenantId,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        rentAmount: body.rentAmount,
        billingDayOfMonth: body.billingDayOfMonth || 1,
        status: body.status || 'pending',
      },
      select: {
        id: true,
        unitId: true,
        tenantId: true,
        startDate: true,
        endDate: true,
        rentAmount: true,
        billingDayOfMonth: true,
        status: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Mark unit as unavailable
    await prisma.unit.update({
      where: { id: body.unitId },
      data: { isAvailable: false },
    });

    // Trigger webhook
    await triggerWebhook(ctx.landlordId, 'lease.created', {
      leaseId: lease.id,
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      startDate: lease.startDate.toISOString(),
      rentAmount: Number(lease.rentAmount),
    });

    return apiSuccess(
      {
        id: lease.id,
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        startDate: lease.startDate.toISOString(),
        endDate: lease.endDate?.toISOString() || null,
        rentAmount: Number(lease.rentAmount),
        billingDayOfMonth: lease.billingDayOfMonth,
        status: lease.status,
        tenant: {
          id: lease.tenant.id,
          name: lease.tenant.name,
          email: lease.tenant.email,
        },
        unit: {
          id: lease.unit.id,
          name: lease.unit.name,
        },
        property: {
          id: lease.unit.property.id,
          name: lease.unit.property.name,
        },
        createdAt: lease.createdAt.toISOString(),
      },
      201
    );
  },
  ['leases:write']
);
