import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  createTemplate,
  listTemplates,
} from '@/lib/services/lease-template.service';

/**
 * GET /api/lease-templates
 * List templates for the authenticated landlord
 * Optional query param: propertyId - filter by property
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json(
        { success: false, message: 'Landlord account not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId') || undefined;

    const templates = await listTemplates(landlord.id, propertyId);

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('GET /api/lease-templates error:', message);
    }
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lease-templates
 * Create a new lease template
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json(
        { success: false, message: 'Landlord account not found' },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { name, type, isDefault, builderConfig, pdfUrl, signatureFields, mergeFields, propertyIds } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Name is required' },
        { status: 400 }
      );
    }

    if (!type || !['builder', 'uploaded_pdf'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Type must be "builder" or "uploaded_pdf"' },
        { status: 400 }
      );
    }

    // For uploaded PDFs, pdfUrl is required
    if (type === 'uploaded_pdf' && !pdfUrl) {
      return NextResponse.json(
        { success: false, message: 'PDF URL is required for uploaded PDF templates' },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      landlordId: landlord.id,
      name,
      type,
      isDefault: isDefault ?? false,
      builderConfig,
      pdfUrl,
      signatureFields,
      mergeFields,
      propertyIds: propertyIds ?? [],
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error('POST /api/lease-templates error:', message);
    }
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
