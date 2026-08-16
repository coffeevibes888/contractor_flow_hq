import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { DocumentService } from '@/lib/services/document.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user is a landlord
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Get the document and verify it belongs to this landlord's application
    const document = await prisma.verificationDocument.findUnique({
      where: { id },
      select: {
        id: true,
        landlordId: true,
        applicationId: true,
      },
    });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Primary check: landlordId matches directly
    if (document.landlordId === landlord.id) {
      const url = await DocumentService.getSecureUrl(id, 600, session.user.id, 'admin_view');
      return NextResponse.json({ url });
    }

    // Fallback: verify via the application's property (handles legacy docs)
    if (document.applicationId) {
      const application = await prisma.rentalApplication.findUnique({
        where: { id: document.applicationId },
        include: {
          unit: { include: { property: { select: { landlordId: true } } } },
        },
      });

      const appLandlordId = application?.unit?.property?.landlordId;

      // Also try resolving via propertySlug if unit not linked
      if (!appLandlordId && application?.propertySlug) {
        const property = await prisma.property.findFirst({
          where: { slug: application.propertySlug },
          select: { landlordId: true },
        });
        if (property?.landlordId === landlord.id) {
          const url = await DocumentService.getSecureUrl(id, 600, session.user.id, 'admin_view');
          return NextResponse.json({ url });
        }
      }

      if (appLandlordId === landlord.id) {
        const url = await DocumentService.getSecureUrl(id, 600, session.user.id, 'admin_view');
        return NextResponse.json({ url });
      }
    }

    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  } catch (error) {
    console.error('Error getting document URL:', error);
    return NextResponse.json(
      { message: 'Failed to get document URL' },
      { status: 500 }
    );
  }
}
