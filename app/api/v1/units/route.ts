/**
 * External API - Units Endpoint
 * 
 * GET /api/v1/units - List all units
 * POST /api/v1/units - Create a new unit
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

// GET /api/v1/units
export const GET = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'units:read')) {
      return apiError('Missing required scope: units:read', 403, 'insufficient_scope');
    }

    const { page, limit, offset } = parsePagination(req);
    const { field, order } = parseSort(req, ['name', 'createdAt', 'rentAmount'], 'createdAt');

    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId');
    const isAvailable = url.searchParams.get('isAvailable');
    const type = url.searchParams.get('type');

    const where: any = {
      property: {
        landlordId: ctx.landlordId,
        deletedAt: null,
      },
    };

    if (propertyId) where.propertyId = propertyId;
    if (isAvailable !== null) where.isAvailable = isAvailable === 'true';
    if (type) where.type = type;

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        select: {
          id: true,
          propertyId: true,
          name: true,
          type: true,
          building: true,
          floor: true,
          bedrooms: true,
          bathrooms: true,
          sizeSqFt: true,
          rentAmount: true,
          isAvailable: true,
          availableFrom: true,
          amenities: true,
          images: true,
          createdAt: true,
          updatedAt: true,
          property: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { [field]: order },
        take: limit,
        skip: offset,
      }),
      prisma.unit.count({ where }),
    ]);

    const formattedUnits = units.map(u => ({
      id: u.id,
      propertyId: u.propertyId,
      propertyName: u.property.name,
      propertySlug: u.property.slug,
      name: u.name,
      type: u.type,
      building: u.building,
      floor: u.floor,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
      sizeSqFt: u.sizeSqFt,
      rentAmount: Number(u.rentAmount),
      isAvailable: u.isAvailable,
      availableFrom: u.availableFrom?.toISOString() || null,
      amenities: u.amenities,
      images: u.images,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return apiPaginated(formattedUnits, total, page, limit);
  },
  ['units:read']
);

// POST /api/v1/units
export const POST = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    if (!hasScope(ctx.scopes, 'units:write')) {
      return apiError('Missing required scope: units:write', 403, 'insufficient_scope');
    }

    const body = await req.json();

    // Validate required fields
    if (!body.propertyId) {
      return apiError('Property ID is required', 400, 'validation_error');
    }

    if (!body.name) {
      return apiError('Unit name is required', 400, 'validation_error');
    }

    if (!body.type) {
      return apiError('Unit type is required', 400, 'validation_error');
    }

    if (body.rentAmount === undefined || body.rentAmount === null) {
      return apiError('Rent amount is required', 400, 'validation_error');
    }

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: {
        id: body.propertyId,
        landlordId: ctx.landlordId,
        deletedAt: null,
      },
    });

    if (!property) {
      return apiError('Property not found', 404, 'not_found');
    }

    const unit = await prisma.unit.create({
      data: {
        propertyId: body.propertyId,
        name: body.name,
        type: body.type,
        building: body.building,
        floor: body.floor,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        sizeSqFt: body.sizeSqFt,
        rentAmount: body.rentAmount,
        isAvailable: body.isAvailable ?? true,
        availableFrom: body.availableFrom ? new Date(body.availableFrom) : null,
        amenities: body.amenities || [],
        images: body.images || [],
      },
      select: {
        id: true,
        propertyId: true,
        name: true,
        type: true,
        building: true,
        floor: true,
        bedrooms: true,
        bathrooms: true,
        sizeSqFt: true,
        rentAmount: true,
        isAvailable: true,
        availableFrom: true,
        amenities: true,
        createdAt: true,
      },
    });

    return apiSuccess(
      {
        id: unit.id,
        propertyId: unit.propertyId,
        name: unit.name,
        type: unit.type,
        building: unit.building,
        floor: unit.floor,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms ? Number(unit.bathrooms) : null,
        sizeSqFt: unit.sizeSqFt,
        rentAmount: Number(unit.rentAmount),
        isAvailable: unit.isAvailable,
        availableFrom: unit.availableFrom?.toISOString() || null,
        amenities: unit.amenities,
        createdAt: unit.createdAt.toISOString(),
      },
      201
    );
  },
  ['units:write']
);
