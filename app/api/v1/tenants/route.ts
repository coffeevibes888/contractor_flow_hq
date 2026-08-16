/**
 * External API - Tenants Endpoint
 * 
 * GET /api/v1/tenants - List all tenants with active leases
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import {
  withApiAuth,
  apiPaginated,
  apiError,
  parsePagination,
  ApiContext,
} from '@/lib/api/middleware';
import { hasScope } from '@/lib/services/api-key.service';

// GET /api/v1/tenants
export const GET = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'tenants:read')) {
      return apiError('Missing required scope: tenants:read', 403, 'insufficient_scope');
    }

    const { page, limit, offset } = parsePagination(req);

    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId');
    const unitId = url.searchParams.get('unitId');
    const status = url.searchParams.get('status') || 'active';

    // Get tenants through their leases
    const leaseWhere: any = {
      unit: {
        property: {
          landlordId: ctx.landlordId,
          deletedAt: null,
        },
      },
    };

    if (status === 'active') {
      leaseWhere.status = 'active';
    } else if (status === 'all') {
      // No status filter
    } else {
      leaseWhere.status = status;
    }

    if (propertyId) {
      leaseWhere.unit = { ...leaseWhere.unit, propertyId };
    }

    if (unitId) {
      leaseWhere.unitId = unitId;
    }

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where: leaseWhere,
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          rentAmount: true,
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.lease.count({ where: leaseWhere }),
    ]);

    const formattedTenants = leases.map(lease => ({
      id: lease.tenant.id,
      name: lease.tenant.name,
      email: lease.tenant.email,
      phone: lease.tenant.phoneNumber,
      lease: {
        id: lease.id,
        status: lease.status,
        startDate: lease.startDate.toISOString(),
        endDate: lease.endDate?.toISOString() || null,
        rentAmount: Number(lease.rentAmount),
      },
      unit: {
        id: lease.unit.id,
        name: lease.unit.name,
      },
      property: {
        id: lease.unit.property.id,
        name: lease.unit.property.name,
      },
      createdAt: lease.tenant.createdAt.toISOString(),
    }));

    return apiPaginated(formattedTenants, total, page, limit);
  },
  ['tenants:read']
);
