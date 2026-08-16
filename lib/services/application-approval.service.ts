/**
 * Application Approval Service
 * Handles the complete workflow when a landlord approves a rental application:
 * 1. Validates unit availability
 * 2. Resolves the appropriate lease template
 * 3. Auto-generates a lease from the template
 * 4. Creates signature requests for tenant and landlord
 * 5. Sends signing invitation email to tenant
 * 
 * Requirements: 2.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { prisma } from '@/db/prisma';
import { resolveTemplateForProperty } from './lease-template.service';
import { generateLeaseHtml, buildLeaseDataFromRecords } from './lease-builder';
import { htmlToPdfBuffer } from './pdf';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { sendBrandedEmail } from './email-service';
import { NotificationService } from './notification-service';
import crypto from 'crypto';

// Error codes for application approval
export const ApprovalErrorCodes = {
  NO_LEASE_TEMPLATE: 'NO_LEASE_TEMPLATE',
  UNIT_UNAVAILABLE: 'UNIT_UNAVAILABLE',
  APPLICATION_NOT_FOUND: 'APPLICATION_NOT_FOUND',
  APPLICATION_NOT_PENDING: 'APPLICATION_NOT_PENDING',
  PROPERTY_NOT_FOUND: 'PROPERTY_NOT_FOUND',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  LEASE_GENERATION_FAILED: 'LEASE_GENERATION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ApprovalErrorCode = typeof ApprovalErrorCodes[keyof typeof ApprovalErrorCodes];

export class ApprovalError extends Error {
  code: ApprovalErrorCode;
  
  constructor(code: ApprovalErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApprovalError';
  }
}

export interface ApproveApplicationInput {
  applicationId: string;
  unitId: string;
  leaseStartDate: Date;
  leaseEndDate?: Date | null; // null = month-to-month
  rentAmount?: number; // Override unit rent if needed
  billingDayOfMonth?: number;
  landlordId: string;
}

export interface ApproveApplicationResult {
  success: true;
  application: {
    id: string;
    status: string;
    fullName: string;
    email: string;
  };
  lease: {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    rentAmount: number;
  };
  signingUrl: string;
  signingToken: string;
}


/**
 * Approve a rental application and auto-generate a lease
 * This is the main entry point for the approval workflow
 */
export async function approveApplication(
  input: ApproveApplicationInput
): Promise<ApproveApplicationResult> {
  const {
    applicationId,
    unitId,
    leaseStartDate,
    leaseEndDate,
    rentAmount,
    billingDayOfMonth = 1,
    landlordId,
  } = input;

  // 1. Fetch and validate the application
  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: {
      applicant: {
        select: { id: true, name: true, email: true },
      },
      unit: {
        include: {
          property: {
            include: {
              landlord: {
                select: {
                  id: true,
                  name: true,
                  companyName: true,
                  companyAddress: true,
                  companyEmail: true,
                  companyPhone: true,
                  securityDepositMonths: true,
                  petDepositEnabled: true,
                  petDepositAmount: true,
                  petRentEnabled: true,
                  petRentAmount: true,
                  cleaningFeeEnabled: true,
                  cleaningFeeAmount: true,
                  ownerUserId: true,
                  owner: { select: { email: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!application) {
    throw new ApprovalError(
      ApprovalErrorCodes.APPLICATION_NOT_FOUND,
      'Application not found'
    );
  }

  if (application.status !== 'pending') {
    throw new ApprovalError(
      ApprovalErrorCodes.APPLICATION_NOT_PENDING,
      `Application is already ${application.status}`
    );
  }

  if (!application.applicant) {
    throw new ApprovalError(
      ApprovalErrorCodes.TENANT_NOT_FOUND,
      'Applicant user not found'
    );
  }

  // 2. Validate unit availability
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      property: {
        include: {
          landlord: {
            select: {
              id: true,
              name: true,
              companyName: true,
              companyAddress: true,
              companyEmail: true,
              companyPhone: true,
              securityDepositMonths: true,
              petDepositEnabled: true,
              petDepositAmount: true,
              petRentEnabled: true,
              petRentAmount: true,
              cleaningFeeEnabled: true,
              cleaningFeeAmount: true,
              ownerUserId: true,
              owner: { select: { email: true, name: true } },
            },
          },
        },
      },
      leases: {
        where: {
          status: { in: ['active', 'pending_signature'] },
        },
        select: { id: true },
      },
    },
  });

  if (!unit) {
    throw new ApprovalError(
      ApprovalErrorCodes.UNIT_UNAVAILABLE,
      'Unit not found'
    );
  }

  if (!unit.isAvailable) {
    throw new ApprovalError(
      ApprovalErrorCodes.UNIT_UNAVAILABLE,
      'Unit is not available for rent'
    );
  }

  if (unit.leases.length > 0) {
    throw new ApprovalError(
      ApprovalErrorCodes.UNIT_UNAVAILABLE,
      'Unit already has an active or pending lease'
    );
  }

  if (!unit.property) {
    throw new ApprovalError(
      ApprovalErrorCodes.PROPERTY_NOT_FOUND,
      'Property not found for this unit'
    );
  }

  const property = unit.property;
  const landlord = property.landlord;

  if (!landlord || landlord.id !== landlordId) {
    throw new ApprovalError(
      ApprovalErrorCodes.VALIDATION_ERROR,
      'Unauthorized: You do not own this property'
    );
  }

  // 3. Resolve lease template for the property
  const template = await resolveTemplateForProperty(property.id, landlordId);

  if (!template) {
    throw new ApprovalError(
      ApprovalErrorCodes.NO_LEASE_TEMPLATE,
      'No lease template configured for this property. Please configure a lease template before approving applications.'
    );
  }

  // 4. Generate the lease
  const effectiveRentAmount = rentAmount ?? Number(unit.rentAmount);
  const isMonthToMonth = !leaseEndDate;

  const tenant = application.applicant;
  const tenantName = tenant.name || application.fullName;
  const tenantEmail = tenant.email || application.email;

  // Build lease data from records
  const propertyAddress = property.address as { street?: string; city?: string; state?: string; zipCode?: string } | null;
  
  const leaseData = buildLeaseDataFromRecords({
    landlord: {
      name: landlord.name,
      companyName: landlord.companyName,
      companyAddress: landlord.companyAddress,
      companyEmail: landlord.companyEmail,
      companyPhone: landlord.companyPhone,
      securityDepositMonths: Number(landlord.securityDepositMonths) || 1,
      petDepositEnabled: landlord.petDepositEnabled,
      petDepositAmount: landlord.petDepositAmount ? Number(landlord.petDepositAmount) : null,
      petRentEnabled: landlord.petRentEnabled,
      petRentAmount: landlord.petRentAmount ? Number(landlord.petRentAmount) : null,
      cleaningFeeEnabled: landlord.cleaningFeeEnabled,
      cleaningFeeAmount: landlord.cleaningFeeAmount ? Number(landlord.cleaningFeeAmount) : null,
    },
    property: {
      name: property.name,
      address: {
        street: propertyAddress?.street || '',
        city: propertyAddress?.city || '',
        state: propertyAddress?.state || '',
        zipCode: propertyAddress?.zipCode || '',
      },
      amenities: property.amenities || [],
    },
    unit: {
      name: unit.name,
      type: unit.type,
      rentAmount: effectiveRentAmount,
    },
    tenant: {
      name: tenantName,
      email: tenantEmail,
    },
    leaseTerms: {
      startDate: leaseStartDate,
      endDate: leaseEndDate || null,
      isMonthToMonth,
      billingDayOfMonth,
    },
  });

  // Generate HTML
  const html = generateLeaseHtml(leaseData);

  // Generate PDF and upload
  let fileUrl: string;
  let fileType: string;
  let fileSize: number;

  try {
    const pdfBuffer = await htmlToPdfBuffer(html);
    
    const result = await uploadToCloudinary(pdfBuffer, {
      folder: `leases/${landlordId}`,
      resource_type: 'raw',
      public_id: `lease-${property.slug}-${unit.name.replace(/\s+/g, '-')}-${Date.now()}`,
    });
    
    fileUrl = result.secure_url;
    fileType = 'pdf';
    fileSize = pdfBuffer.length;
  } catch (pdfError: any) {
    console.warn('PDF generation failed, falling back to HTML:', pdfError.message);
    
    const htmlBuffer = Buffer.from(html, 'utf-8');
    const result = await uploadToCloudinary(htmlBuffer, {
      folder: `leases/${landlordId}`,
      resource_type: 'raw',
      public_id: `lease-${property.slug}-${unit.name.replace(/\s+/g, '-')}-${Date.now()}.html`,
    });
    
    fileUrl = result.secure_url;
    fileType = 'html';
    fileSize = htmlBuffer.length;
  }

  // 5. Create LegalDocument record
  const document = await prisma.legalDocument.create({
    data: {
      landlordId,
      name: `Lease - ${property.name} ${unit.name}`,
      type: 'lease',
      category: 'generated',
      state: propertyAddress?.state || null,
      fileUrl,
      fileType,
      fileSize,
      isTemplate: false,
      isActive: true,
      isFieldsConfigured: true,
      description: `Auto-generated lease for ${tenantName} at ${property.name} - ${unit.name}`,
      signatureFields: generateSignatureFields(),
    },
  });

  // 6. Create Lease record with pending_signature status
  const lease = await prisma.lease.create({
    data: {
      unitId,
      tenantId: tenant.id,
      legalDocumentId: document.id,
      templateId: template.id,
      startDate: leaseStartDate,
      endDate: leaseEndDate || null,
      rentAmount: effectiveRentAmount,
      billingDayOfMonth,
      status: 'pending_signature',
      generatedFrom: 'auto',
      generatedAt: new Date(),
    },
  });

  // ✅ NEW: Emit event for lease creation (schedules rent reminders)
  try {
    const { dbTriggers } = await import('@/lib/event-system');
    await dbTriggers.onLeaseCreate(lease);
  } catch (error) {
    console.error('Failed to emit lease event:', error);
  }

  // 7. Create signature request for tenant
  const tenantToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.documentSignatureRequest.create({
    data: {
      documentId: document.id,
      leaseId: lease.id,
      recipientEmail: tenantEmail,
      recipientName: tenantName,
      status: 'sent',
      expiresAt,
      token: tenantToken,
      role: 'tenant',
    },
  });

  // 8. Update application status to approved
  await prisma.rentalApplication.update({
    where: { id: applicationId },
    data: {
      status: 'approved',
      unitId,
    },
  });

  // 9. Mark unit as unavailable
  await prisma.unit.update({
    where: { id: unitId },
    data: { isAvailable: false },
  });

  // 10. Send signing invitation email to tenant
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const signingUrl = `${baseUrl}/sign/${tenantToken}`;

  try {
    await sendBrandedEmail({
      to: tenantEmail,
      subject: 'Your Lease is Ready to Sign',
      template: 'notification',
      data: {
        landlord,
        recipientName: tenantName,
        notificationType: 'lease_signing',
        title: 'Your Lease is Ready to Sign',
        message: `Congratulations! Your application for ${property.name} - ${unit.name} has been approved. Please sign your lease to complete the process.`,
        actionUrl: signingUrl,
        loginUrl: signingUrl,
      },
      landlordId,
    } as any);
  } catch (emailError) {
    console.error('Failed to send signing invitation email:', emailError);
    // Don't fail the approval if email fails - the signing URL is still valid
  }

  // 11. Notify landlord about the approval
  if (landlord.ownerUserId) {
    await NotificationService.createNotification({
      userId: landlord.ownerUserId,
      type: 'application',
      title: 'Application Approved',
      message: `Lease generated for ${tenantName} at ${property.name} - ${unit.name}. Waiting for tenant signature.`,
      actionUrl: `/admin/leases/${lease.id}`,
      metadata: { leaseId: lease.id, applicationId },
      landlordId,
    });
  }

  return {
    success: true,
    application: {
      id: application.id,
      status: 'approved',
      fullName: application.fullName,
      email: application.email,
    },
    lease: {
      id: lease.id,
      status: 'pending_signature',
      startDate: leaseStartDate,
      endDate: leaseEndDate || null,
      rentAmount: effectiveRentAmount,
    },
    signingUrl,
    signingToken: tenantToken,
  };
}


/**
 * Reject a rental application
 */
export interface RejectApplicationInput {
  applicationId: string;
  reason?: string;
  landlordId: string;
}

export interface RejectApplicationResult {
  success: true;
  application: {
    id: string;
    status: string;
    fullName: string;
    email: string;
  };
}

export async function rejectApplication(
  input: RejectApplicationInput
): Promise<RejectApplicationResult> {
  const { applicationId, reason, landlordId } = input;

  // Fetch the application with property info
  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: {
      applicant: {
        select: { id: true, name: true, email: true },
      },
      unit: {
        include: {
          property: {
            include: {
              landlord: {
                select: { id: true, name: true, ownerUserId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!application) {
    throw new ApprovalError(
      ApprovalErrorCodes.APPLICATION_NOT_FOUND,
      'Application not found'
    );
  }

  if (application.status !== 'pending') {
    throw new ApprovalError(
      ApprovalErrorCodes.APPLICATION_NOT_PENDING,
      `Application is already ${application.status}`
    );
  }

  // Verify landlord ownership
  const property = application.unit?.property;
  if (!property?.landlord || property.landlord.id !== landlordId) {
    throw new ApprovalError(
      ApprovalErrorCodes.VALIDATION_ERROR,
      'Unauthorized: You do not own this property'
    );
  }

  // Update application status
  await prisma.rentalApplication.update({
    where: { id: applicationId },
    data: {
      status: 'rejected',
      adminResponse: reason || 'Application rejected',
    },
  });

  // Send rejection notification email to applicant
  const applicantEmail = application.applicant?.email || application.email;
  const applicantName = application.applicant?.name || application.fullName;

  if (applicantEmail) {
    try {
      await sendBrandedEmail({
        to: applicantEmail,
        subject: 'Application Update',
        template: 'notification',
        data: {
          landlord: property.landlord,
          recipientName: applicantName,
          notificationType: 'application_rejected',
          title: 'Application Update',
          message: reason 
            ? `We regret to inform you that your application for ${property.name} has not been approved. ${reason}`
            : `We regret to inform you that your application for ${property.name} has not been approved at this time.`,
        },
        landlordId,
      } as any);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }
  }

  return {
    success: true,
    application: {
      id: application.id,
      status: 'rejected',
      fullName: application.fullName,
      email: application.email,
    },
  };
}

/**
 * Generate pre-configured signature fields for the lease
 */
function generateSignatureFields() {
  return [
    {
      id: 'landlord_signature',
      type: 'signature',
      role: 'landlord',
      page: -1,
      x: 10,
      y: 35,
      width: 25,
      height: 5,
      required: true,
      label: 'Landlord Signature',
    },
    {
      id: 'landlord_date',
      type: 'date',
      role: 'landlord',
      page: -1,
      x: 10,
      y: 42,
      width: 15,
      height: 3,
      required: true,
      label: 'Date',
    },
    {
      id: 'tenant_signature',
      type: 'signature',
      role: 'tenant',
      page: -1,
      x: 10,
      y: 50,
      width: 25,
      height: 5,
      required: true,
      label: 'Tenant Signature',
    },
    {
      id: 'tenant_date',
      type: 'date',
      role: 'tenant',
      page: -1,
      x: 10,
      y: 57,
      width: 15,
      height: 3,
      required: true,
      label: 'Date',
    },
  ];
}

/**
 * Check if a unit is available for a new lease
 */
export async function isUnitAvailable(unitId: string): Promise<boolean> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      leases: {
        where: {
          status: { in: ['active', 'pending_signature'] },
        },
        select: { id: true },
      },
    },
  });

  if (!unit) return false;
  if (!unit.isAvailable) return false;
  if (unit.leases.length > 0) return false;

  return true;
}

/**
 * Get the template that would be used for a property
 * Useful for showing in the approval UI
 */
export async function getTemplateForApproval(
  propertyId: string,
  landlordId: string
) {
  const template = await resolveTemplateForProperty(propertyId, landlordId);
  
  if (!template) {
    return {
      hasTemplate: false,
      template: null,
      message: 'No lease template configured for this property',
    };
  }

  return {
    hasTemplate: true,
    template: {
      id: template.id,
      name: template.name,
      type: template.type,
      isDefault: template.isDefault,
    },
    message: template.isDefault 
      ? 'Using default lease template'
      : 'Using property-specific lease template',
  };
}
