import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import nodemailer from 'nodemailer';
import { APP_NAME } from '@/lib/constants';
import { randomBytes } from 'crypto';

function generateCode(): string {
  return randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    const { name, email, phone } = body as {
      name?: string;
      email?: string;
      phone?: string;
    };

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && !/^(\+1|1)?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: 'Please provide at least an email or phone number.' },
        { status: 400 }
      );
    }

    const landlordResult = await getOrCreateCurrentLandlord();

    if (!landlordResult.success) {
      return NextResponse.json(
        { success: false, message: landlordResult.message || 'Unable to determine landlord.' },
        { status: 400 }
      );
    }

    const landlord = landlordResult.landlord;

    // Verify the user owns this landlord
    if (landlord.ownerUserId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - you do not own this landlord account' },
        { status: 403 }
      );
    }

    const inviteByEmail = landlord.inviteViaEmail !== false;
    const inviteBySms = landlord.inviteViaSms === true;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'http://localhost:3000';

    // Get or create a generic (no property) invite code for this landlord so
    // the tenant is automatically linked when they sign up.
    const existingCode = await prisma.landlordInviteCode.findFirst({
      where: {
        landlordId: landlord.id,
        propertyId: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    const inviteCodeRecord =
      existingCode ??
      (await prisma.landlordInviteCode.create({
        data: {
          landlordId: landlord.id,
          code: generateCode(),
          isActive: true,
        },
      }));

    // Build the sign-up URL with the invite code pre-filled
    const signupUrl = `${baseUrl}/sign-up?role=tenant&inviteCode=${encodeURIComponent(inviteCodeRecord.code)}`;

    let emailSent = false;

    if (inviteByEmail && email) {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const fromAddress = process.env.SMTP_FROM_EMAIL || 'noreply@propertyflowhq.com';

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return NextResponse.json(
          { success: false, message: 'Email configuration is missing on the server.' },
          { status: 500 }
        );
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const subject = `${landlord.name || 'Your landlord'} invited you to manage your lease online`;

      const html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
          <h2 style="margin-bottom: 0.5rem;">You have been invited as a tenant</h2>
          <p>Hi ${name || 'there'},</p>
          <p>
            ${landlord.name || 'Your landlord'} is using ${APP_NAME} to manage leases and rent payments.
            Use the link below to create your account, view your lease, and pay rent online.
          </p>
          <p style="margin: 1.5rem 0;">
            <a
              href="${signupUrl}"
              style="display: inline-block; padding: 0.75rem 1.5rem; background: #059669; color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 600;"
            >
              Set up my tenant account
            </a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #4b5563; word-break: break-all;">${signupUrl}</p>
        </div>
      `;

      await transporter.sendMail({
        from: `${APP_NAME} <${fromAddress}>`,
        to: email,
        subject,
        html,
      });

      emailSent = true;
    }

    if (inviteBySms && phone) {
      // SMS invite functionality - implement SMS service integration here
      // For now, this is a placeholder
    }

    if (!emailSent && !(inviteBySms && phone)) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid channel to send invite. Please enable email or provide a phone number.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Tenant invite sent successfully.' });
  } catch (error) {
    // Log error without exposing sensitive details
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in invite-tenant API:', error instanceof Error ? error.message : 'Unknown error');
    }
    return NextResponse.json(
      { success: false, message: 'Something went wrong while sending the invite.' },
      { status: 500 }
    );
  }
}
