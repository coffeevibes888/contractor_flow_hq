import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  getTemplateById,
  assignTemplateToProperties,
} from '@/lib/services/lease-template.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/lease-templates/[id]/assign
 * Assign a template to properties
 * 
 * Body: { propertyIds: string[] }
 * 
 * This removes any existing template assignments for the given properties
 * and assigns this template to them.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify template exists and ownership
    const existingTemplate = await getTemplateById(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord || existingTemplate.landlordId !== landlord.id) {
      return NextResponse.json(
        { success: false, message: 'Not authorized to assign this template' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { propertyIds } = body;

    if (!Array.isArray(propertyIds)) {
      return NextResponse.json(
        { success: false, message: 'propertyIds must be an array' },
        { status: 400 }
      );
    }

    // Verify all properties belong to this landlord
    if (propertyIds.length > 0) {
      const properties = await prisma.property.findMany({
        where: {
          id: { in: propertyIds },
          landlordId: landlord.id,
        },
        select: { id: true },
      });

      const foundIds = new Set(properties.map(p => p.id));
      const invalidIds = propertyIds.filter((pid: string) => !foundIds.has(pid));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Some properties not found or not owned by you',
            invalidPropertyIds: invalidIds,
          },
          { status: 400 }
        );
      }
    }

    const template = await assignTemplateToProperties(id, propertyIds);

    return NextResponse.json({
      success: true,
      template,
      message: propertyIds.length > 0 
        ? `Template assigned to ${propertyIds.length} property(ies)` 
        : 'Template unassigned from all properties',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('POST /api/lease-templates/[id]/assign error:', message);
    }
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
