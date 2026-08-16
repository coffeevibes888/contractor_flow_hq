import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma as db } from '@/db/prisma';
import { DocumentService } from '@/lib/services/document.service';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log(`[GDPR] Processing data deletion request for user ${userId}`);

    // Get all verification documents uploaded by this user
    const documents = await db.verificationDocument.findMany({
      where: { uploadedById: userId },
    });

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete each document
    for (const document of documents) {
      try {
        await DocumentService.deleteDocument(document.id);
        deletedCount++;
      } catch (error: any) {
        console.error(`Failed to delete document ${document.id}:`, error);
        errors.push(`Document ${document.id}: ${error.message}`);
      }
    }

    // Also delete any ApplicationVerification records for user's applications
    const applications = await db.rentalApplication.findMany({
      where: { applicantId: userId },
      select: { id: true },
    });

    for (const app of applications) {
      await db.applicationVerification.deleteMany({
        where: { applicationId: app.id },
      });
    }

    console.log(`[GDPR] Deleted ${deletedCount} documents for user ${userId}`);

    // TODO: Send confirmation email (Task 23)

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} verification documents`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[GDPR] Deletion failed:', error);
    return NextResponse.json(
      { error: 'Data deletion failed', details: error.message },
      { status: 500 }
    );
  }
}
