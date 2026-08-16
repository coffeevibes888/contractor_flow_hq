/**
 * External API - Maintenance Tickets Endpoint
 * 
 * GET /api/v1/maintenance - List all maintenance tickets
 * POST /api/v1/maintenance - Create a new maintenance ticket
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

// GET /api/v1/maintenance
export const GET = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'maintenance:read')) {
      return apiError('Missing required scope: maintenance:read', 403, 'insufficient_scope');
    }

    const { page, limit, offset } = parsePagination(req);
    const { field, order } = parseSort(req, ['createdAt', 'priority', 'status'], 'createdAt');

    const url = new URL(req.url);
    const unitId = url.searchParams.get('unitId');
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');

    const where: any = {
      unit: {
        property: {
          landlordId: ctx.landlordId,
          deletedAt: null,
        },
      },
    };

    if (unitId) where.unitId = unitId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [tickets, total] = await Promise.all([
      prisma.maintenanceTicket.findMany({
        where,
        select: {
          id: true,
          unitId: true,
          tenantId: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          assignedToName: true,
          cost: true,
          isRecurring: true,
          resolvedAt: true,
          createdAt: true,
          updatedAt: true,
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
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { [field]: order },
        take: limit,
        skip: offset,
      }),
      prisma.maintenanceTicket.count({ where }),
    ]);

    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      unitId: ticket.unitId,
      tenantId: ticket.tenantId,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assignedTo: ticket.assignedToName,
      cost: ticket.cost ? Number(ticket.cost) : null,
      isRecurring: ticket.isRecurring,
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
      unit: ticket.unit ? {
        id: ticket.unit.id,
        name: ticket.unit.name,
      } : null,
      property: ticket.unit ? {
        id: ticket.unit.property.id,
        name: ticket.unit.property.name,
      } : null,
      tenant: ticket.tenant ? {
        id: ticket.tenant.id,
        name: ticket.tenant.name,
        email: ticket.tenant.email,
      } : null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    }));

    return apiPaginated(formattedTickets, total, page, limit);
  },
  ['maintenance:read']
);

// POST /api/v1/maintenance
export const POST = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'maintenance:write')) {
      return apiError('Missing required scope: maintenance:write', 403, 'insufficient_scope');
    }

    const body = await req.json();

    // Validate required fields
    if (!body.title) {
      return apiError('Title is required', 400, 'validation_error');
    }

    if (!body.description) {
      return apiError('Description is required', 400, 'validation_error');
    }

    // If unitId provided, verify it belongs to landlord
    if (body.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: body.unitId,
          property: {
            landlordId: ctx.landlordId,
            deletedAt: null,
          },
        },
      });

      if (!unit) {
        return apiError('Unit not found', 404, 'not_found');
      }
    }

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        unitId: body.unitId || null,
        tenantId: body.tenantId || null,
        title: body.title,
        description: body.description,
        status: body.status || 'open',
        priority: body.priority || 'medium',
        assignedToName: body.assignedTo,
        cost: body.cost,
        isRecurring: body.isRecurring || false,
      },
      select: {
        id: true,
        unitId: true,
        tenantId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assignedToName: true,
        cost: true,
        isRecurring: true,
        createdAt: true,
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

    // Trigger webhook
    await triggerWebhook(ctx.landlordId, 'maintenance.created', {
      ticketId: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      unitId: ticket.unitId,
    });

    return apiSuccess(
      {
        id: ticket.id,
        unitId: ticket.unitId,
        tenantId: ticket.tenantId,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedToName,
        cost: ticket.cost ? Number(ticket.cost) : null,
        isRecurring: ticket.isRecurring,
        unit: ticket.unit ? {
          id: ticket.unit.id,
          name: ticket.unit.name,
        } : null,
        property: ticket.unit ? {
          id: ticket.unit.property.id,
          name: ticket.unit.property.name,
        } : null,
        createdAt: ticket.createdAt.toISOString(),
      },
      201
    );
  },
  ['maintenance:write']
);
