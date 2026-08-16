import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getSignedCloudinaryUrl } from '@/lib/cloudinary';

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

    // Get the document
    const prismaAny = prisma as any;
    const document = await prismaAny.applicationDocument.findUnique({
      where: { id },
      select: {
        id: true,
        applicationId: true,
        cloudinaryPublicId: true,
        cloudinaryResourceType: true,
      },
    });

    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Verify the application belongs to this landlord's property
    const application = await prisma.rentalApplication.findUnique({
      where: { id: document.applicationId },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!application?.unit?.property || application.unit.property.landlordId !== landlord.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Generate signed URL
    const url = getSignedCloudinaryUrl({
      publicId: document.cloudinaryPublicId,
      resourceType: document.cloudinaryResourceType,
      expiresInSeconds: 60 * 10, // 10 minutes
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting document URL:', error);
    return NextResponse.json(
      { message: 'Failed to get document URL' },
      { status: 500 }
    );
  }
}
