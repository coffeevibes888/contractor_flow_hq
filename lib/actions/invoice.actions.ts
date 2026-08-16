/**
 * Tenant Invoice Actions
 * Server actions for landlords to create and manage tenant invoices
 */

'use server';

import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import { formatError } from '@/lib/utils';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { tenantInvoiceSchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';
import { NotificationService } from '@/lib/services/notification-service';

// ============= CREATE INVOICE =============

/**
 * Create a new invoice for a tenant
 */
export async function createTenantInvoice(data: z.infer<typeof tenantInvoiceSchema>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const validatedData = tenantInvoiceSchema.parse(data);

    // Verify the property belongs to this landlord
    const property = await prisma.property.findFirst({
      where: {
        id: validatedData.propertyId,
        landlordId: landlordResult.landlord.id,
      },
    });

    if (!property) {
      return { success: false, message: 'Property not found or access denied' };
    }

    // Verify the tenant exists
    const tenant = await prisma.user.findUnique({
      where: { id: validatedData.tenantId },
    });

    if (!tenant) {
      return { success: false, message: 'Tenant not found' };
    }

    // Create the invoice
    const invoice = await prisma.tenantInvoice.create({
      data: {
        propertyId: validatedData.propertyId,
        tenantId: validatedData.tenantId,
        leaseId: validatedData.leaseId || null,
        amount: validatedData.amount,
        reason: validatedData.reason,
        description: validatedData.description || null,
        dueDate: new Date(validatedData.dueDate),
        status: 'pending',
      },
    });

    // Notify the tenant
    await NotificationService.createNotification({
      userId: validatedData.tenantId,
      type: 'payment',
      title: 'New Invoice',
      message: `You have a new invoice for $${validatedData.amount.toFixed(2)} - ${validatedData.reason}`,
      actionUrl: '/user/profile/invoices',
      metadata: { invoiceId: invoice.id, propertyId: property.id },
      landlordId: landlordResult.landlord.id,
    });

    revalidatePath('/admin/invoices');
    revalidatePath('/user/profile/invoices');

    return {
      success: true,
      message: 'Invoice created and tenant notified',
      invoiceId: invoice.id,
    };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { success: false, message: formatError(error) };
  }
}

// ============= GET INVOICES =============

/**
 * Get all invoices for the current landlord's properties
 */
export async function getLandlordInvoices() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', invoices: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, invoices: [] };
    }

    const invoices = await prisma.tenantInvoice.findMany({
      where: {
        property: {
          landlordId: landlordResult.landlord.id,
        },
      },
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        propertyName: inv.property.name,
        tenantName: inv.tenant.name,
        tenantEmail: inv.tenant.email,
        amount: Number(inv.amount),
        reason: inv.reason,
        description: inv.description,
        dueDate: inv.dueDate.toISOString(),
        status: inv.status,
        paidAt: inv.paidAt?.toISOString() || null,
        createdAt: inv.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), invoices: [] };
  }
}

/**
 * Get invoices for a specific tenant (for tenant portal)
 */
export async function getTenantInvoices() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', invoices: [] };
    }

    const invoices = await prisma.tenantInvoice.findMany({
      where: {
        tenantId: session.user.id,
      },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        propertyName: inv.property.name,
        amount: Number(inv.amount),
        reason: inv.reason,
        description: inv.description,
        dueDate: inv.dueDate.toISOString(),
        status: inv.status,
        paidAt: inv.paidAt?.toISOString() || null,
        createdAt: inv.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), invoices: [] };
  }
}

// ============= UPDATE INVOICE STATUS =============

/**
 * Cancel an invoice
 */
export async function cancelInvoice(invoiceId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const invoice = await prisma.tenantInvoice.findFirst({
      where: {
        id: invoiceId,
        property: {
          landlordId: landlordResult.landlord.id,
        },
      },
    });

    if (!invoice) {
      return { success: false, message: 'Invoice not found or access denied' };
    }

    if (invoice.status === 'paid') {
      return { success: false, message: 'Cannot cancel a paid invoice' };
    }

    await prisma.tenantInvoice.update({
      where: { id: invoiceId },
      data: { status: 'cancelled' },
    });

    revalidatePath('/admin/invoices');
    revalidatePath('/user/profile/invoices');

    return { success: true, message: 'Invoice cancelled' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/**
 * Mark invoice as paid (manual)
 */
export async function markInvoicePaid(invoiceId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const invoice = await prisma.tenantInvoice.findFirst({
      where: {
        id: invoiceId,
        property: {
          landlordId: landlordResult.landlord.id,
        },
      },
    });

    if (!invoice) {
      return { success: false, message: 'Invoice not found or access denied' };
    }

    await prisma.tenantInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'manual',
      },
    });

    revalidatePath('/admin/invoices');
    revalidatePath('/user/profile/invoices');

    return { success: true, message: 'Invoice marked as paid' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// ============= GET TENANTS FOR PROPERTY =============

/**
 * Get all tenants for a specific property (for invoice creation dropdown)
 */
export async function getPropertyTenants(propertyId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated', tenants: [] };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message, tenants: [] };
    }

    // Get all active leases for this property
    const leases = await prisma.lease.findMany({
      where: {
        status: 'active',
        unit: {
          property: {
            id: propertyId,
            landlordId: landlordResult.landlord.id,
          },
        },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        unit: { select: { name: true } },
      },
    });

    return {
      success: true,
      tenants: leases.map((lease) => ({
        id: lease.tenant.id,
        name: lease.tenant.name,
        email: lease.tenant.email,
        unitName: lease.unit.name,
        leaseId: lease.id,
      })),
    };
  } catch (error) {
    return { success: false, message: formatError(error), tenants: [] };
  }
}

// ============= SEND INVOICE EMAIL =============

/**
 * Send an invoice by email to any address (tenant auto-filled or custom)
 */
export async function sendInvoiceByEmail(invoiceId: string, recipientEmail?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success) {
      return { success: false, message: landlordResult.message };
    }

    const invoice = await prisma.tenantInvoice.findFirst({
      where: {
        id: invoiceId,
        property: { landlordId: landlordResult.landlord.id },
      },
      include: {
        property: { select: { name: true } },
        tenant: { select: { name: true, email: true } },
      },
    });

    if (!invoice) {
      return { success: false, message: 'Invoice not found or access denied' };
    }

    const toEmail = recipientEmail || invoice.tenant.email;
    const invoiceNum = invoice.id.slice(-8).toUpperCase();

    const { render } = await import('@react-email/components');
    const TenantInvoiceEmail = (await import('@/email/templates/tenant-invoice')).default;

    const html = await render(
      TenantInvoiceEmail({
        tenantName: invoice.tenant.name,
        landlordName: landlordResult.landlord.name,
        invoiceNumber: invoiceNum,
        propertyName: invoice.property.name,
        amount: Number(invoice.amount),
        reason: invoice.reason,
        description: invoice.description,
        dueDate: new Date(invoice.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      })
    );

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

    const { error } = await resend.emails.send({
      from: `${landlordResult.landlord.name} <${senderEmail}>`,
      to: toEmail,
      subject: `Invoice #${invoiceNum} — ${invoice.reason} ($${Number(invoice.amount).toFixed(2)})`,
      html,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: `Invoice emailed to ${toEmail}` };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
