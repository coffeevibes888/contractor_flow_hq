import { Resend } from 'resend';
import { prisma } from '@/db/prisma';
import RentReminderEmail from '@/email/templates/rent-reminder';
import { render } from '@react-email/render';
import MaintenanceUpdateEmail from '@/email/templates/maintenance-update';
import ApplicationStatusEmail from '@/email/templates/application-status';
import NotificationEmail from '@/email/templates/notification';
import OwnerStatementEmail from '@/email/templates/owner-statement';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string | string[];
  subject: string;
  template: 'rent-reminder' | 'maintenance-update' | 'application-status' | 'notification' | 'owner-statement';
  data: any;
  landlordId: string;
}

export async function sendBrandedEmail({ to, subject, template, data, landlordId }: EmailOptions) {
  try {
    // Get landlord information for branding (including logo and contact email)
    const landlord = await prisma.landlord.findUnique({
      where: { id: landlordId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logoUrl: true,
        useSubdomain: true,
        companyEmail: true,
        notificationEmail: true,
      },
    });

    if (!landlord) {
      throw new Error('Landlord not found');
    }

    // Generate email content based on template
    let emailHtml: string;

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    
    // Show PM/landlord name professionally while sending from our verified domain.
    // e.g. "Joe's Realty via PropertyFlowHQ <noreply@propertyflowhq.com>"
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'PropertyFlowHQ';
    const landlordName = landlord.name || 'Property Management';
    const fromName = `${landlordName} via ${appName}`;
    // Use landlord's own contact email as reply-to so replies go directly to them
    const replyToEmail = landlord.companyEmail || landlord.notificationEmail || senderEmail;

    switch (template) {
      case 'rent-reminder':
        emailHtml = await render(RentReminderEmail({ ...data, landlord }));
        break;
      case 'maintenance-update':
        emailHtml = await render(MaintenanceUpdateEmail({ ...data, landlord }));
        break;
      case 'application-status':
        emailHtml = await render(ApplicationStatusEmail({ ...data, landlord }));
        break;
      case 'notification':
        emailHtml = await render(NotificationEmail({ ...data, landlord }));
        break;
      case 'owner-statement':
        emailHtml = await render(OwnerStatementEmail({ ...data, landlord }));
        break;
      default:
        throw new Error('Unknown email template');
    }

    // Send email using Resend
    const { data: emailData, error } = await resend.emails.send({
      from: `${fromName} <${senderEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject: `${subject} - ${landlordName}`,
      html: emailHtml,
      replyTo: replyToEmail,
    });

    if (error) {
      console.error('Email service error:', error);
      throw new Error(error.message);
    }

    console.log('Email sent successfully:', emailData?.id);
    return { success: true, messageId: emailData?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

// Specific email functions
export async function sendRentReminder(
  tenantEmail: string,
  tenantName: string,
  propertyName: string,
  unitName: string,
  rentAmount: string,
  dueDate: string,
  landlordId: string,
  paymentUrl: string
) {
  return sendBrandedEmail({
    to: tenantEmail,
    subject: 'Rent Payment Reminder',
    template: 'rent-reminder',
    data: {
      tenantName,
      propertyName,
      unitName,
      rentAmount,
      dueDate,
      paymentUrl,
    },
    landlordId,
  });
}

export async function sendMaintenanceUpdate(
  tenantEmail: string,
  tenantName: string,
  propertyName: string,
  unitName: string,
  ticketTitle: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  updateMessage: string,
  landlordId: string,
  ticketUrl: string
) {
  return sendBrandedEmail({
    to: tenantEmail,
    subject: 'Maintenance Request Update',
    template: 'maintenance-update',
    data: {
      tenantName,
      propertyName,
      unitName,
      ticketTitle,
      status,
      updateMessage,
      ticketUrl,
    },
    landlordId,
  });
}

export async function sendApplicationStatusUpdate(
  applicantEmail: string,
  applicantName: string,
  propertyName: string,
  unitName: string,
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn',
  message: string,
  landlordId: string,
  applicationUrl: string
) {
  return sendBrandedEmail({
    to: applicantEmail,
    subject: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    template: 'application-status',
    data: {
      applicantName,
      propertyName,
      unitName,
      status,
      message,
      applicationUrl,
    },
    landlordId,
  });
}

// Test email function
export async function testEmailService() {
  try {
    // Simple test - try to send to Resend's test endpoint
    const { data, error } = await resend.emails.send({
      from: 'Test <onboarding@resend.dev>',
      to: 'delivered@resend.dev', // Resend's test email
      subject: 'Test Email',
      html: '<p>Test email from Property Management App</p>',
    });

    if (error) {
      console.error('Email test failed:', error);
      return false;
    }

    console.log('Email service is ready:', data?.id);
    return true;
  } catch (error) {
    console.error('Email service test failed:', error);
    return false;
  }
}
