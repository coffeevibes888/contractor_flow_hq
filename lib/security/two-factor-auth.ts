/**
 * Two-Factor Authentication (2FA) utilities
 * Uses TOTP (Time-based One-Time Password) algorithm
 */

import crypto from 'crypto';
import { prisma } from '@/db/prisma';
import { encryptSensitiveData, decryptSensitiveData } from './encryption';

const TOTP_WINDOW = 1; // Allow 1 step before/after for clock drift
const TOTP_STEP = 30; // 30 second intervals
const TOTP_DIGITS = 6;

/**
 * Generate a random secret for TOTP
 */
export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('base64');
}

/**
 * Generate TOTP code from secret
 */
export function generateTOTPCode(secret: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const counter = Math.floor(time / 1000 / TOTP_STEP);
  
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));
  
  const decodedSecret = Buffer.from(secret, 'base64');
  const hmac = crypto.createHmac('sha1', decodedSecret);
  hmac.update(buffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS);
  
  return code.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify TOTP code
 */
export function verifyTOTPCode(secret: string, code: string): boolean {
  const now = Date.now();
  
  // Check current and adjacent time windows for clock drift
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const timestamp = now + (i * TOTP_STEP * 1000);
    const expectedCode = generateTOTPCode(secret, timestamp);
    if (expectedCode === code) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate QR code URL for authenticator apps
 */
export function generateTOTPQRCodeURL(
  secret: string,
  email: string,
  issuer: string = 'PropertyFlowHQ'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  const encodedSecret = encodeURIComponent(secret);
  
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Enable 2FA for a user
 */
export async function enable2FA(userId: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const secret = generateTOTPSecret();
  const backupCodes = generateBackupCodes();
  const qrCodeUrl = generateTOTPQRCodeURL(secret, user.email);
  
  // Store encrypted secret and backup codes
  await prisma.twoFactorAuth.upsert({
    where: { userId },
    create: {
      userId,
      secretEncrypted: encryptSensitiveData(secret),
      backupCodesEncrypted: encryptSensitiveData(JSON.stringify(backupCodes)),
      isEnabled: false, // Not enabled until verified
    },
    update: {
      secretEncrypted: encryptSensitiveData(secret),
      backupCodesEncrypted: encryptSensitiveData(JSON.stringify(backupCodes)),
      isEnabled: false,
    },
  });
  
  return { secret, qrCodeUrl, backupCodes };
}

/**
 * Verify and activate 2FA
 */
export async function verify2FASetup(userId: string, code: string): Promise<boolean> {
  const twoFA = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  });
  
  if (!twoFA || !twoFA.secretEncrypted) {
    throw new Error('2FA not set up');
  }
  
  const secret = decryptSensitiveData(twoFA.secretEncrypted);
  const isValid = verifyTOTPCode(secret, code);
  
  if (isValid) {
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true, verifiedAt: new Date() },
    });
  }
  
  return isValid;
}

/**
 * Verify 2FA code during login
 */
export async function verify2FALogin(userId: string, code: string): Promise<boolean> {
  const twoFA = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  });
  
  if (!twoFA || !twoFA.isEnabled || !twoFA.secretEncrypted) {
    return true; // 2FA not enabled, allow login
  }
  
  const secret = decryptSensitiveData(twoFA.secretEncrypted);
  
  // First try TOTP code
  if (verifyTOTPCode(secret, code)) {
    return true;
  }
  
  // Then try backup codes
  if (twoFA.backupCodesEncrypted) {
    const backupCodes: string[] = JSON.parse(
      decryptSensitiveData(twoFA.backupCodesEncrypted)
    );
    
    const codeIndex = backupCodes.indexOf(code.toUpperCase());
    if (codeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodesEncrypted: encryptSensitiveData(JSON.stringify(backupCodes)),
        },
      });
      return true;
    }
  }
  
  return false;
}

/**
 * Check if user has 2FA enabled
 */
export async function has2FAEnabled(userId: string): Promise<boolean> {
  const twoFA = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    select: { isEnabled: true },
  });
  
  return twoFA?.isEnabled ?? false;
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: string): Promise<void> {
  await prisma.twoFactorAuth.delete({
    where: { userId },
  });
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const twoFA = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  });
  
  if (!twoFA || !twoFA.isEnabled) {
    throw new Error('2FA not enabled');
  }
  
  const backupCodes = generateBackupCodes();
  
  await prisma.twoFactorAuth.update({
    where: { userId },
    data: {
      backupCodesEncrypted: encryptSensitiveData(JSON.stringify(backupCodes)),
    },
  });
  
  return backupCodes;
}
