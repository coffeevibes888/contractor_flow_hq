import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';
import { DocumentService } from '@/lib/services/document.service';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or landlord
    if (session.user.role !== 'admin' && session.user.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Forbidden: Only landlords and admins can review documents' },
        { status: 403 }
      );
    }

    // Get landlord ID for filtering
    let landlordId: string | null = null;
    
    if (session.user.role === 'landlord' || session.user.role === 'admin') {
      const landlord = await db.landlord.findFirst({
        where: { ownerUserId: session.user.id },
      });
      
      if (!landlord) {
        return NextResponse.json(
          { error: 'Landlord profile not found' },
          { status: 404 }
        );
      }
      
      landlordId = landlord.id;
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get documents flagged for manual review
    const where = {
      landlordId: landlordId || undefined,
      verificationStatus: 'needs_review',
    };

    const [documents, total] = await Promise.all([
      db.verificationDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          application: {
            include: {
              unit: {
                include: {
                  property: true,
                },
              },
              applicant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.verificationDocument.count({ where }),
    ]);

    // Generate secure URLs and format response
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        try {
          const secureUrl = await DocumentService.getSecureUrl(doc.id, 3600); // 1 hour for review
          
          return {
            id: doc.id,
            category: doc.category,
            docType: doc.docType,
            originalFileName: doc.originalFileName,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
            verificationStatus: doc.verificationStatus,
            ocrConfidence: doc.ocrConfidence,
            extractedData: doc.extractedData,
            fraudScore: doc.fraudScore,
            fraudIndicators: doc.fraudIndicators,
            rejectionReason: doc.rejectionReason,
            createdAt: doc.createdAt,
            secureUrl,
            application: {
              id: doc.application.id,
              fullName: doc.application.fullName,
              email: doc.application.email,
              propertyName: doc.application.unit?.property?.name,
              unitName: doc.application.unit?.name,
            },
            uploadedBy: doc.uploadedBy,
          };
        } catch (error) {
          console.error(`Failed to generate URL for document ${doc.id}:`, error);
          return null;
        }
      })
    );

    // Filter out any null results
    const validDocuments = documentsWithUrls.filter(Boolean);

    return NextResponse.json({
      documents: validDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get pending documents error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve pending documents' },
      { status: 500 }
    );
  }
}
