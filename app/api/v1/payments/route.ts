/**
 * External API - Payments Endpoint
 * 
 * GET /api/v1/payments - List all rent payments
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import {
  withApiAuth,
  apiPaginated,
  apiError,
  parsePagination,
  parseSort,
  ApiContext,
} from '@/lib/api/middleware';
import { hasScope } from '@/lib/services/api-key.service';

// GET /api/v1/payments
export const GET = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'payments:read')) {
      return apiError('Missing required scope: payments:read', 403, 'insufficient_scope');
    }

    const { page, limit, offset } = parsePagination(req);
    const { field, order } = parseSort(req, ['dueDate', 'paidAt', 'createdAt', 'amount'], 'createdAt');

    const url = new URL(req.url);
    const leaseId = url.searchParams.get('leaseId');
    const tenantId = url.searchParams.get('tenantId');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const where: any = {
      lease: {
        unit: {
          property: {
            landlordId: ctx.landlordId,
            deletedAt: null,
          },
        },
      },
    };

    if (leaseId) where.leaseId = leaseId;
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (startDate) where.dueDate = { ...where.dueDate, gte: new Date(startDate) };
    if (endDate) where.dueDate = { ...where.dueDate, lte: new Date(endDate) };

    const [payments, total] = await Promise.all([
      prisma.rentPayment.findMany({
        where,
        select: {
          id: true,
          leaseId: true,
          tenantId: true,
          dueDate: true,
          paidAt: true,
          amount: true,
          status: true,
          paymentMethod: true,
          convenienceFee: true,
          isRecurring: true,
          createdAt: true,
          updatedAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lease: {
            select: {
              id: true,
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
          },
        },
        orderBy: { [field]: order },
        take: limit,
        skip: offset,
      }),
      prisma.rentPayment.count({ where }),
    ]);

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      leaseId: payment.leaseId,
      tenantId: payment.tenantId,
      dueDate: payment.dueDate.toISOString(),
      paidAt: payment.paidAt?.toISOString() || null,
      amount: Number(payment.amount),
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      convenienceFee: payment.convenienceFee ? Number(payment.convenienceFee) : 0,
      isRecurring: payment.isRecurring,
      tenant: {
        id: payment.tenant.id,
        name: payment.tenant.name,
        email: payment.tenant.email,
      },
      unit: {
        id: payment.lease.unit.id,
        name: payment.lease.unit.name,
      },
      property: {
        id: payment.lease.unit.property.id,
        name: payment.lease.unit.property.name,
      },
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    }));

    return apiPaginated(formattedPayments, total, page, limit);
  },
  ['payments:read']
);
