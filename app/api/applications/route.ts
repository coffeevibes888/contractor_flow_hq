import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { rentalApplicationSchema } from "@/lib/validators";
import { encryptField } from "@/lib/encrypt";
import { NotificationService } from "@/lib/services/notification-service";

/**
 * Applications API - works with path-based routing
 * Landlord is determined from the propertySlug in the request body
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
    }

    // Validate input with Zod
    const validationResult = rentalApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed", 
          errors: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }, 
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify the property exists (if propertySlug is provided)
    let property = null;
    if (data.propertySlug) {
      property = await prisma.property.findFirst({
        where: {
          slug: data.propertySlug,
        },
      });

      if (!property) {
        return NextResponse.json(
          { success: false, message: "Property not found" },
          { status: 404 }
        );
      }
    }

    // Encrypt SSN - NEVER store in plain text
    const encryptedSsn = data.ssn ? await encryptField(data.ssn) : null;

    // Build notes WITHOUT SSN (security: SSN should never be in notes)
    const notesCombined = [
      data.notes,
      data.age ? `Age: ${data.age}` : undefined,
      data.currentAddress ? `Address: ${data.currentAddress}` : undefined,
      data.currentEmployer ? `Employer: ${data.currentEmployer}` : undefined,
      data.monthlySalary ? `Salary (monthly): ${data.monthlySalary}` : undefined,
      data.yearlySalary ? `Salary (yearly): ${data.yearlySalary}` : undefined,
      data.hasPets ? `Has pets: ${data.hasPets}` : undefined,
      data.petCount ? `Number of pets: ${data.petCount}` : undefined,
      data.hasPets && data.hasPets.toLowerCase().startsWith("y")
        ? "Note: Applicant was informed that a $300 annual pet fee is added for pets."
        : undefined,
      data.propertySlug ? `Property: ${data.propertySlug}` : undefined,
      // SSN is NOT included in notes - it's stored separately encrypted
    ]
      .filter(Boolean)
      .join("\n");

    const applicantId = session.user.id as string;

    // Find an available unit for the property
    const unit = data.propertySlug
      ? await prisma.unit.findFirst({
          where: {
            isAvailable: true,
            property: {
              slug: data.propertySlug,
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : null;

    // Check if a draft application exists for this applicant + property.
    // If so, UPDATE it instead of creating a new record so that any
    // verification documents (ID, paystubs) uploaded during the wizard
    // remain linked to the same applicationId.
    const existingDraft = await prisma.rentalApplication.findFirst({
      where: {
        applicantId,
        propertySlug: data.propertySlug || null,
        status: 'draft',
      },
    });

    let application;

    if (existingDraft) {
      // Promote the draft to a real pending application
      application = await prisma.rentalApplication.update({
        where: { id: existingDraft.id },
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          notes: notesCombined,
          encryptedSsn,
          status: 'pending',
          unitId: unit?.id ?? existingDraft.unitId,
        },
      });

      // Update the existing verification record status if still incomplete
      await prisma.applicationVerification.updateMany({
        where: { applicationId: application.id, overallStatus: 'incomplete' },
        data: { overallStatus: 'in_progress' },
      });

      // Re-link any verification documents that were uploaded under the draft
      // and update their landlordId now that we know the property/landlord
      if (property?.landlordId) {
        await prisma.verificationDocument.updateMany({
          where: { applicationId: application.id },
          data: { landlordId: property.landlordId },
        });
      }
    } else {
      application = await prisma.rentalApplication.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          notes: notesCombined,
          encryptedSsn,
          status: 'pending',
          propertySlug: data.propertySlug || null,
          unitId: unit?.id ?? null,
          applicantId,
        },
      });

      // Create verification record for the new application
      await prisma.applicationVerification.create({
        data: {
          applicationId: application.id,
          identityStatus: 'pending',
          employmentStatus: 'pending',
          overallStatus: 'incomplete',
        },
      });
    }

    // Notify the landlord team about the new application. Falls out to
    // every member with `process_applications` or `manage_tenants` (plus
    // owner/admin), each respecting their own per-user notification
    // preferences. Maintenance techs and accountants drop out by design.
    if (property && property.landlordId) {
      try {
        const { notifyLandlordTeam } = await import('@/lib/services/team-notifications');
        await notifyLandlordTeam({
          landlordId: property.landlordId,
          category: 'application',
          type: 'application',
          title: 'New Rental Application',
          message: `New application received from ${data.fullName} for ${property.name}${unit ? ` - ${unit.name}` : ''}`,
          actionUrl: `/admin/applications/${application.id}`,
          metadata: { applicationId: application.id, propertyId: property.id },
        });
      } catch (err) {
        // Best-effort — don't fail the application submission if
        // notifications hiccup. The bell row + email is a follow-up.
        console.error('applications POST: team notify failed', err);
      }
    }

    revalidatePath("/admin/applications");

    return NextResponse.json({ 
      success: true, 
      applicationId: application.id,
      message: 'Application created successfully'
    });
  } catch (error) {
    // Log error without exposing sensitive details
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // In production, use a proper logging service instead of console.error
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error("Application error", errorMessage);
    }
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
