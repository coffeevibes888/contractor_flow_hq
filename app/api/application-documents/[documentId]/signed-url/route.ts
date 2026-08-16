import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getSignedCloudinaryUrl } from '@/lib/cloudinary';

async function resolveLandlordIdForApplication(application: {
  unitId: string | null;
  propertySlug: string | null;
}) {
  if (application.unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: application.unitId },
      select: { property: { select: { landlordId: true } } },
    });
    return unit?.property?.landlordId || null;
  }

  if (application.propertySlug) {
    const property = await prisma.property.findUnique({
      where: { slug: application.propertySlug },
      select: { landlordId: true },
    });
    return property?.landlordId || null;
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { documentId } = await params;

    const prismaAny = prisma as any;
    const doc = await prismaAny.applicationDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        applicationId: true,
        landlordId: true,
        uploadedById: true,
        cloudinaryPublicId: true,
        cloudinaryResourceType: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
    }

    const role = session.user.role;
    const userId = session.user.id as string;

    if (role === 'tenant') {
      const app = await prisma.rentalApplication.findUnique({
        where: { id: doc.applicationId },
        select: { applicantId: true },
      });

      if (!app || app.applicantId !== userId) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'admin' || role === 'superAdmin') {
      // ok
    } else if (role === 'landlord' || role === 'property_manager') {
      const landlord = await prisma.landlord.findFirst({
        where: { ownerUserId: userId },
        select: { id: true },
      });

      if (!landlord) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }

      const app = await prisma.rentalApplication.findUnique({
        where: { id: doc.applicationId },
        select: { unitId: true, propertySlug: true },
      });

      if (!app) {
        return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });
      }

      const landlordId = await resolveLandlordIdForApplication(app);
      if (!landlordId || landlordId !== landlord.id) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const url = getSignedCloudinaryUrl({
      publicId: doc.cloudinaryPublicId,
      resourceType: doc.cloudinaryResourceType,
      expiresInSeconds: 60 * 10,
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Signed URL error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
