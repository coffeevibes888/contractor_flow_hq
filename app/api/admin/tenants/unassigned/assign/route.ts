import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NotificationService } from '@/lib/services/notification-service';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      linkId, 
      tenantId, 
      propertyId, 
      unitId, 
      leaseStartDate, 
      leaseEndDate,
      generateLease,
      rentAmount 
    } = body;

    // Verify the link belongs to this landlord
    const link = await prisma.tenantLandlordLink.findFirst({
      where: {
        id: linkId,
        landlord: {
          ownerUserId: session.user.id
        }
      },
      include: {
        tenant: true,
        landlord: true
      }
    });

    if (!link) {
      return NextResponse.json({ message: 'Link not found' }, { status: 404 });
    }

    // Get property and unit details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        defaultLeaseDocument: true,
        landlord: true
      }
    });

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { name: true }
    });

    if (!property || !unit) {
      return NextResponse.json({ message: 'Property or unit not found' }, { status: 404 });
    }

    // Update the link status
    await prisma.tenantLandlordLink.update({
      where: { id: linkId },
      data: {
        status: 'assigned',
        assignedAt: new Date(),
        assignedToPropertyId: propertyId,
        assignedToUnitId: unitId
      }
    });

    let lease = null;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate lease if requested and property has default lease
    if (generateLease && property.defaultLeaseDocument) {
      // Create lease record using existing lease system
      lease = await prisma.lease.create({
        data: {
          unitId,
          tenantId,
          legalDocumentId: property.defaultLeaseDocumentId,
          startDate: new Date(leaseStartDate),
          endDate: leaseEndDate ? new Date(leaseEndDate) : null,
          rentAmount: rentAmount || 0,
          billingDayOfMonth: 1,
          status: 'pending_signature',
          generatedFrom: 'auto',
          generatedAt: new Date()
        }
      });

      // Create signature request for tenant
      // This uses the existing signature system - just create the request record
      const tenantSignatureRequest = await prisma.documentSignatureRequest.create({
        data: {
          documentId: property.defaultLeaseDocumentId!,
          leaseId: lease.id,
          recipientEmail: link.tenant.email,
          recipientName: link.tenant.name,
          role: 'tenant',
          signerName: link.tenant.name,
          signerEmail: link.tenant.email,
          status: 'sent',
          token: crypto.randomUUID()
        }
      });

      // Notify tenant about lease signature
      await NotificationService.createNotification({
        userId: tenantId,
        type: 'reminder',
        title: 'Your Lease is Ready to Sign',
        message: `Your lease for ${property.name} - ${unit.name} is ready for your signature.`,
        actionUrl: `/sign/${tenantSignatureRequest.token}`
      });

      // Send email to tenant (using existing email service)
      try {
        const { sendBrandedEmail } = await import('@/lib/services/email-service');
        await sendBrandedEmail({
          to: link.tenant.email,
          subject: 'Your Lease is Ready to Sign',
          template: 'notification',
          data: {
            title: 'Lease Ready for Signature',
            message: `Your lease for ${property.name} - ${unit.name} has been generated and is ready for your signature.`,
            actionText: 'Sign Lease Now',
            actionUrl: `${baseUrl}/sign/${tenantSignatureRequest.token}`,
            additionalInfo: `Monthly rent: $${rentAmount}. Lease starts ${new Date(leaseStartDate).toLocaleDateString()}.`
          },
          landlordId: link.landlordId
        });
      } catch (emailError) {
        console.error('Failed to send lease signature email:', emailError);
        // Don't fail the request if email fails
      }

      // Notify landlord that lease was created
      if (property.landlord?.ownerUserId) {
        await NotificationService.createNotification({
          userId: property.landlord.ownerUserId,
          type: 'application',
          title: 'Lease Generated',
          message: `Lease for ${link.tenant.name} at ${property.name} - ${unit.name} has been sent for signature.`,
          actionUrl: `/admin/leases`
        });
      }
    } else if (!property.defaultLeaseDocument) {
      // No default lease - notify landlord to create manually
      if (property.landlord?.ownerUserId) {
        await NotificationService.createNotification({
          userId: property.landlord.ownerUserId,
          type: 'reminder',
          title: 'Create Lease for New Tenant',
          message: `${link.tenant.name} has been assigned to ${property.name} - ${unit.name}. Create their lease when ready.`,
          actionUrl: `/admin/tenants`
        });
      }
    }

    // Notify tenant of assignment
    await NotificationService.createNotification({
      userId: tenantId,
      type: 'application',
      title: 'Property Assignment Complete',
      message: `You've been assigned to ${property.name} - ${unit.name}. ${
        lease 
          ? 'Your lease is ready for signature.' 
          : 'Your property manager will send your lease soon.'
      }`,
      actionUrl: lease ? '/user/profile/lease' : '/user/dashboard'
    });

    // Send email to tenant about assignment
    try {
      const { sendBrandedEmail } = await import('@/lib/services/email-service');
      await sendBrandedEmail({
        to: link.tenant.email,
        subject: 'Welcome to Your New Home!',
        template: 'notification',
        data: {
          title: 'Property Assignment Complete',
          message: `You've been assigned to ${property.name} - ${unit.name}.`,
          actionText: lease ? 'Sign Your Lease' : 'View Dashboard',
          actionUrl: lease ? `${baseUrl}/sign/${lease.id}` : `${baseUrl}/user/dashboard`,
          additionalInfo: lease 
            ? 'Your lease is ready for signature. Please review and sign it to complete your move-in process.'
            : 'Your property manager will send your lease shortly.'
        },
        landlordId: link.landlordId
      });
    } catch (emailError) {
      console.error('Failed to send assignment email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      leaseId: lease?.id,
      message: 'Tenant assigned successfully'
    });
  } catch (error) {
    console.error('Assign tenant error:', error);
    return NextResponse.json(
      { message: 'Failed to assign tenant' },
      { status: 500 }
    );
  }
}

// Made with Bob
