'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import RentPaymentReceivedEmail from '@/email/templates/rent-payment-received';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyflowhq.com').replace(/\/$/, '');

interface SendLandlordPaymentReceivedEmailParams {
  landlordEmail: string;
  landlordName: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: string;
  paymentMethod: string;
  paidAt: string;
  estimatedArrival: string;
  logoUrl?: string | null;
  isFirstPayment?: boolean;
}

/**
 * Send email to landlord when a tenant pays rent.
 * When isFirstPayment is true, sends a special celebration email instead of
 * the standard receipt — this is the highest-value moment in the product.
 */
export async function sendLandlordPaymentReceivedEmail({
  landlordEmail,
  landlordName,
  tenantName,
  propertyName,
  unitNumber,
  amount,
  paymentMethod,
  paidAt,
  estimatedArrival,
  logoUrl,
  isFirstPayment = false,
}: SendLandlordPaymentReceivedEmailParams) {
  try {
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

    // First payment: send a celebration email to maximise the "aha moment"
    if (isFirstPayment) {
      const billingUrl = `${APP_URL}/admin/billing`;
      const dashboardUrl = `${APP_URL}/admin/overview`;
      const firstName = landlordName.split(' ')[0];
      const firstPaymentHtml = buildFirstPaymentHtml({
        firstName, tenantName, propertyName, unitNumber,
        amount, estimatedArrival, dashboardUrl, billingUrl,
      });

      const { data, error } = await resend.emails.send({
        from: `Gregory at PropertyFlow HQ <${senderEmail}>`,
        to: landlordEmail,
        subject: `🎉 Your first rent payment just landed — ${amount} from ${tenantName}`,
        html: firstPaymentHtml,
        tags: [{ name: 'email_type', value: 'first_rent_payment' }],
      });

      if (error) {
        console.error('Failed to send first-payment celebration email:', error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    }

    // Standard payment receipt
    const emailHtml = await render(
      RentPaymentReceivedEmail({
        landlordName,
        tenantName,
        propertyName,
        unitNumber,
        amount,
        paymentMethod,
        paidAt,
        estimatedArrival,
        logoUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: `PropertyFlow HQ <${senderEmail}>`,
      to: landlordEmail,
      subject: `💰 Rent Payment Received - ${amount} from ${tenantName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send landlord payment email:', error);
      return { success: false, error: error.message };
    }

    console.log('Landlord payment notification sent:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending landlord payment email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

interface FirstPaymentParams {
  firstName: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: string;
  estimatedArrival: string;
  dashboardUrl: string;
  billingUrl: string;
}

function buildFirstPaymentHtml({
  firstName, tenantName, propertyName, unitNumber,
  amount, estimatedArrival, dashboardUrl, billingUrl,
}: FirstPaymentParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1f2328;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;max-width:560px;">

        <tr><td style="background:linear-gradient(135deg,#059669,#0284c7);padding:32px 32px 24px;">
          <p style="margin:0;font-size:28px;text-align:center;">🎉</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;text-align:center;">
            Your first rent payment just landed.
          </h1>
        </td></tr>

        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0 0 14px;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;color:#374151;">
            <strong>${tenantName}</strong> just paid <strong style="color:#059669;">${amount}</strong> for ${propertyName}${unitNumber ? ` · Unit ${unitNumber}` : ''}.
          </p>
          <p style="margin:0 0 16px;color:#374151;">
            That money is on its way to your bank — estimated arrival: <strong>${estimatedArrival}</strong>.
          </p>
          <p style="margin:0 0 0;color:#374151;">
            This is what PropertyFlow does every month, automatically. You didn't have to remind anyone, chase anyone, or check anything. It just happened.
          </p>
        </td></tr>

        <!-- What just happened, explained -->
        <tr><td style="padding:20px 32px 24px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px 20px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#166534;">What PropertyFlow handled for you:</p>
            <table cellpadding="0" cellspacing="0">
              ${[
                'Collected payment securely via bank transfer or card',
                'Logged it to your rent roll automatically',
                'Sent you this notification the moment it cleared',
                `Initiated the bank deposit — arrives ${estimatedArrival}`,
              ].map(item => `
              <tr><td style="padding:4px 0;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="color:#059669;font-size:15px;width:22px;font-weight:700;">✓</td>
                  <td style="font-size:13px;color:#374151;">${item}</td>
                </tr></table>
              </td></tr>`).join('')}
            </table>
          </div>
        </td></tr>

        <tr><td style="padding:0 32px 28px;text-align:center;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#059669;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
            View Your Dashboard →
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
            Still on a free trial?
            <a href="${billingUrl}" style="color:#7c3aed;text-decoration:underline;">Subscribe to keep this running every month →</a>
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:14px;color:#374151;">— Gregory<br><span style="font-size:12px;color:#57606a;">PropertyFlow HQ</span></p>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;font-style:italic;">Reply to this email if you have any questions — I read every one.</p>
        </td></tr>

        <tr><td style="padding:14px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">PropertyFlow HQ · <a href="${APP_URL}" style="color:#9ca3af;">propertyflowhq.com</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
