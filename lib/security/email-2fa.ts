'use server';

/**
 * Email-based Two-Factor Authentication (2FA)
 * Sends a 6-digit code to user's email for verification during login
 */

import crypto from 'crypto';
import { prisma } from '@/db/prisma';
import { Resend } from 'resend';
import { APP_NAME } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
const CODE_EXPIRY_MINUTES = 10;

/**
 * Generate a random 6-digit code
 */
function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send 2FA code to user's email
 */
export async function sendEmail2FACode(userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    // Delete any existing 2FA code for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { 
        email: user.email,
        token: { startsWith: '2FA:' },
      },
    });

    // Store the code with a 2FA prefix to distinguish from email verification tokens
    await prisma.emailVerificationToken.create({
      data: {
        email: user.email,
        token: `2FA:${code}`,
        expires: expiresAt,
      },
    });

    // Send the email
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
    let emailSent = false;
    let emailError: unknown = null;
    try {
      await resend.emails.send({
        from: `${APP_NAME} <${senderEmail}>`,
        to: user.email,
        subject: 'Your login verification code',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Login Verification Code</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Your verification code is:</p>
            <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.</p>
          </div>
        `,
      });
      emailSent = true;
    } catch (err) {
      emailError = err;
    }

    // Dev fallback: when running outside production OR when the Resend send
    // failed, print the code to the server terminal so the developer can
    // continue testing locally without depending on email delivery. The
    // code is never returned to the client — only logged where only the
    // operator can see it.
    if (process.env.NODE_ENV !== 'production' || !emailSent) {
      // eslint-disable-next-line no-console
      console.log(
        `\n[2FA DEV] Code for ${user.email}: ${code} (expires in ${CODE_EXPIRY_MINUTES}m)` +
          (emailError ? `\n[2FA DEV] Resend error: ${(emailError as Error)?.message || emailError}` : '') +
          '\n'
      );
    }

    if (!emailSent && process.env.NODE_ENV === 'production') {
      // In production we treat a Resend failure as a hard error so the user
      // sees a real "couldn't send" message instead of a silently-stuck flow.
      throw emailError ?? new Error('Failed to send 2FA email');
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send 2FA code:', error);
    return { success: false, message: 'Failed to send verification code' };
  }
}

/**
 * Verify 2FA code during login
 */
export async function verifyEmail2FACode(
  userId: string, 
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const record = await prisma.emailVerificationToken.findFirst({
      where: {
        email: user.email,
        token: `2FA:${code}`,
      },
    });

    if (!record) {
      return { success: false, message: 'Invalid code. Please try again.' };
    }

    // Check if expired
    if (new Date() > record.expires) {
      await prisma.emailVerificationToken.delete({
        where: { id: record.id },
      });
      return { success: false, message: 'Code expired. Please request a new one.' };
    }

    // Success - delete the code
    await prisma.emailVerificationToken.delete({
      where: { id: record.id },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to verify 2FA code:', error);
    return { success: false, message: 'Verification failed' };
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function hasEmail2FAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  return user?.twoFactorEnabled ?? false;
}

/**
 * Enable 2FA for a user
 */
export async function enableEmail2FA(userId: string): Promise<{ success: boolean }> {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
  return { success: true };
}

/**
 * Disable 2FA for a user
 */
export async function disableEmail2FA(userId: string): Promise<{ success: boolean }> {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false },
  });
  return { success: true };
}
