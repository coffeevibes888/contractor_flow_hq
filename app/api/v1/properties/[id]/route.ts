/**
 * External API - Single Property Endpoint
 * 
 * GET /api/v1/properties/:id - Get property details
 * PATCH /api/v1/properties/:id - Update property
 * DELETE /api/v1/properties/:id - Delete property (soft delete)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/db/prisma';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  ApiContext,
} from '@/lib/api/middleware';
import { hasScope } from '@/lib/services/api-key.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/properties/:id
export const GET = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const { id } = await (req as any).routeParams;

    if (!hasScope(ctx.scopes, 'properties:read')) {
      return apiError('Missing required scope: properties:read', 403, 'insufficient_scope');
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        landlordId: ctx.landlordId,
        deletedAt: null,
      },
      include: {
        units: {
          select: {
            id: true,
            name: true,
            type: true,
            bedrooms: true,
            bathrooms: true,
            sizeSqFt: true,
            rentAmount: true,
            isAvailable: true,
            availableFrom: true,
          },
        },
        _count: {
          select: {
            units: true,
            workOrders: true,
          },
        },
      },
    });

    if (!property) {
      return apiError('Property not found', 404, 'not_found');
    }

    return apiSuccess({
      id: property.id,
      name: property.name,
      slug: property.slug,
      description: property.description,
      address: property.address,
      type: property.type,
      status: property.status,
      amenities: property.amenities,
      videoUrl: property.videoUrl,
      virtualTourUrl: property.virtualTourUrl,
      units: property.units.map(u => ({
        id: u.id,
        name: u.name,
        type: u.type,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
        sizeSqFt: u.sizeSqFt,
        rentAmount: Number(u.rentAmount),
        isAvailable: u.isAvailable,
        availableFrom: u.availableFrom?.toISOString() || null,
      })),
      stats: {
        unitCount: property._count.units,
        workOrderCount: property._count.workOrders,
      },
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    });
  },
  ['properties:read']
);

// PATCH /api/v1/properties/:id
export const PATCH = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!hasScope(ctx.scopes, 'properties:write')) {
      return apiError('Missing required scope: properties:write', 403, 'insufficient_scope');
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        landlordId: ctx.landlordId,
        deletedAt: null,
      },
    });

    if (!property) {
      return apiError('Property not found', 404, 'not_found');
    }

    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields = [
      'name',
      'description',
      'address',
      'type',
      'status',
      'amenities',
      'videoUrl',
      'virtualTourUrl',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.property.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        address: true,
        type: true,
        status: true,
        amenities: true,
        videoUrl: true,
        virtualTourUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      address: updated.address,
      type: updated.type,
      status: updated.status,
      amenities: updated.amenities,
      videoUrl: updated.videoUrl,
      virtualTourUrl: updated.virtualTourUrl,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  },
  ['properties:write']
);

// DELETE /api/v1/properties/:id
export const DELETE = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!hasScope(ctx.scopes, 'properties:write')) {
      return apiError('Missing required scope: properties:write', 403, 'insufficient_scope');
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        landlordId: ctx.landlordId,
        deletedAt: null,
      },
    });

    if (!property) {
      return apiError('Property not found', 404, 'not_found');
    }

    // Soft delete
    await prisma.property.update({
      where: { id },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    });

    return apiSuccess({ deleted: true });
  },
  ['properties:write']
);
