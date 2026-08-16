import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

// Allowed roles for managing legal documents
const ALLOWED_ROLES = ['admin', 'landlord', 'property_manager'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.legalDocument.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        signatureFields: true,
        isFieldsConfigured: true,
        pageCount: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        signatureFields: document.signatureFields || [],
      },
    });
  } catch (error) {
    console.error('Error fetching document fields:', error);
    return NextResponse.json({ error: 'Failed to fetch document fields' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();
    const { fields, pageCount } = body;

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid fields data' }, { status: 400 });
    }

    // Verify document belongs to this landlord
    const document = await prisma.legalDocument.findFirst({
      where: {
        id,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate field structure
    const validatedFields = fields.map((field: any) => ({
      id: String(field.id),
      type: field.type,
      role: field.role,
      page: Number(field.page),
      x: Number(field.x),
      y: Number(field.y),
      width: Number(field.width),
      height: Number(field.height),
      label: field.label || null,
      required: Boolean(field.required),
    }));

    // Check that we have at least one signature field for tenant
    const hasTenantSignature = validatedFields.some(
      (f: any) => f.type === 'signature' && f.role === 'tenant'
    );

    if (validatedFields.length > 0 && !hasTenantSignature) {
      return NextResponse.json(
        { error: 'At least one tenant signature field is required' },
        { status: 400 }
      );
    }

    // Update document with fields
    const updatedDocument = await prisma.legalDocument.update({
      where: { id },
      data: {
        signatureFields: validatedFields,
        isFieldsConfigured: validatedFields.length > 0,
        pageCount: pageCount || document.pageCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Signature fields saved successfully',
      document: {
        id: updatedDocument.id,
        isFieldsConfigured: updatedDocument.isFieldsConfigured,
        fieldCount: validatedFields.length,
      },
    });
  } catch (error) {
    console.error('Error saving document fields:', error);
    return NextResponse.json({ error: 'Failed to save document fields' }, { status: 500 });
  }
}
