import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';
import { DocumentService } from '@/lib/services/document.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;

    // Verify application exists
    const application = await db.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        unit: {
          include: {
            property: {
              include: {
                landlord: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user is the applicant or the landlord
    const isApplicant = application.applicantId === session.user.id;
    const isLandlord = application.unit?.property?.landlord?.ownerUserId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isApplicant && !isLandlord && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to these documents' },
        { status: 403 }
      );
    }

    // Get all verification documents for this application
    const documents = await db.verificationDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        docType: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        verificationStatus: true,
        verificationCompletedAt: true,
        fraudScore: true,
        fraudIndicators: true,
        rejectionReason: true,
        ocrConfidence: true,
        extractedData: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate secure URLs for each document
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        try {
          const secureUrl = await DocumentService.getSecureUrl(doc.id, 900); // 15 minutes
          return {
            ...doc,
            secureUrl,
          };
        } catch (error) {
          console.error(`Failed to generate URL for document ${doc.id}:`, error);
          return {
            ...doc,
            secureUrl: null,
          };
        }
      })
    );

    return NextResponse.json({
      documents: documentsWithUrls,
    });
  } catch (error: any) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}
