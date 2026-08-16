import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, propertyId } = await request.json();

    if (!documentId || !propertyId) {
      return NextResponse.json(
        { message: 'Document ID and Property ID are required' },
        { status: 400 }
      );
    }

    // Get the landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord not found' }, { status: 404 });
    }

    // Verify the document belongs to this landlord
    const document = await prisma.legalDocument.findFirst({
      where: {
        id: documentId,
        landlordId: landlord.id,
      },
    });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Verify the property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        landlordId: landlord.id,
      },
    });

    if (!property) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    // Update the property with the default lease document
    await prisma.property.update({
      where: { id: propertyId },
      data: { defaultLeaseDocumentId: documentId },
    });

    return NextResponse.json({
      success: true,
      message: `"${document.name}" set as default lease for "${property.name}"`,
    });
  } catch (error) {
    console.error('Error setting default lease:', error);
    return NextResponse.json(
      { message: 'Failed to set default lease' },
      { status: 500 }
    );
  }
}
