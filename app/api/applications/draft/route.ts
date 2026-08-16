import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";

/**
 * Create a draft application
 * This creates a minimal application record that can be updated as the user progresses through the wizard
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { propertySlug } = body;

    const applicantId = session.user.id as string;

    // Check if user already has a draft application for this property
    const existingDraft = await prisma.rentalApplication.findFirst({
      where: {
        applicantId,
        propertySlug: propertySlug || null,
        status: 'draft',
      },
    });

    if (existingDraft) {
      return NextResponse.json({ 
        success: true, 
        applicationId: existingDraft.id,
        message: 'Existing draft found'
      });
    }

    // Create a new draft application
    // Don't pre-populate fullName - let user enter it manually to avoid email being used as name
    const application = await prisma.rentalApplication.create({
      data: {
        fullName: '',
        email: session.user.email || '',
        phone: '',
        notes: '',
        status: 'draft',
        propertySlug: propertySlug || null,
        applicantId,
      },
    });

    // Create verification record for the application
    await prisma.applicationVerification.create({
      data: {
        applicationId: application.id,
        identityStatus: 'pending',
        employmentStatus: 'pending',
        overallStatus: 'incomplete',
      },
    });

    return NextResponse.json({ 
      success: true, 
      applicationId: application.id,
      message: 'Draft application created'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (process.env.NODE_ENV === 'development') {
      console.error("Draft application error", errorMessage);
    }
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
