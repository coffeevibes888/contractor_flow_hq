import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContractorLeadNotification({
  contractorEmail,
  contractorName,
  leadDetails,
  leadId
}: {
  contractorEmail: string;
  contractorName: string;
  leadDetails: {
    projectType: string;
    customerName: string;
    projectDescription: string;
    propertyCity: string;
    propertyState: string;
    urgency: string;
  };
  leadId: string;
}) {
  try {
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
    const dashboardUrl = `${protocol}://${rootDomain}/contractors/leads/${leadId}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Lead: ${leadDetails.projectType}</h2>
        <p>Hi ${contractorName},</p>
        <p>You have a new lead matching your profile!</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Customer:</strong> ${leadDetails.customerName}</p>
          <p><strong>Location:</strong> ${leadDetails.propertyCity}, ${leadDetails.propertyState}</p>
          <p><strong>Urgency:</strong> ${leadDetails.urgency}</p>
          <p><strong>Description:</strong></p>
          <p>${leadDetails.projectDescription}</p>
        </div>

        <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Lead Details</a>
        
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This email was sent from Property Flow HQ.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: `Property Flow Leads <${senderEmail}>`,
      to: contractorEmail,
      subject: `New Lead: ${leadDetails.projectType} in ${leadDetails.propertyCity}`,
      html: html,
    });

    if (error) throw new Error(error.message);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Failed to send contractor notification:', error);
    return { success: false, error };
  }
}

export async function sendCustomerLeadConfirmation({
  customerEmail,
  customerName,
  projectType,
  contractorName
}: {
  customerEmail: string;
  customerName: string;
  projectType: string;
  contractorName?: string;
}) {
  try {
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Request Received!</h2>
        <p>Hi ${customerName},</p>
        <p>We've received your request for <strong>${projectType}</strong>.</p>
        
        ${contractorName ? 
          `<p><strong>${contractorName}</strong> has been notified and will review your project shortly.</p>` :
          `<p>We are matching you with the best available contractors in your area.</p>`
        }
        
        <p>You will receive another email when a contractor responds to your request.</p>
        
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          Property Flow HQ
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: `Property Flow Support <${senderEmail}>`,
      to: customerEmail,
      subject: `Request Received: ${projectType}`,
      html: html,
    });

    if (error) throw new Error(error.message);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Failed to send customer confirmation:', error);
    return { success: false, error };
  }
}
