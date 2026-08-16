import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from '@/lib/services/lease-template.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lease-templates/[id]
 * Get a specific lease template by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const template = await getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify ownership - get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord || template.landlordId !== landlord.id) {
      return NextResponse.json(
        { success: false, message: 'Not authorized to access this template' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('GET /api/lease-templates/[id] error:', message);
    }
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lease-templates/[id]
 * Update a lease template
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
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
        { success: false, message: 'Not authorized to update this template' },
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

    const { name, isDefault, builderConfig, pdfUrl, signatureFields, mergeFields, propertyIds } = body;

    const template = await updateTemplate(id, {
      name,
      isDefault,
      builderConfig,
      pdfUrl,
      signatureFields,
      mergeFields,
      propertyIds,
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('PUT /api/lease-templates/[id] error:', message);
    }

    if (message === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lease-templates/[id]
 * Delete a lease template
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
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
        { success: false, message: 'Not authorized to delete this template' },
        { status: 403 }
      );
    }

    await deleteTemplate(id);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('DELETE /api/lease-templates/[id] error:', message);
    }
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
