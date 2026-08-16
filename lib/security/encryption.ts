/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Derive a 32-byte key from the provided key
  return crypto.scryptSync(key, 'salt', 32);
}

/**
 * Encrypt sensitive data
 * @param plaintext - The data to encrypt
 * @returns Encrypted data as base64 string (iv:authTag:ciphertext)
 */
export function encryptSensitiveData(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine iv, authTag, and encrypted data
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * @param encryptedData - The encrypted data (iv:authTag:ciphertext)
 * @returns Decrypted plaintext
 */
export function decryptSensitiveData(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash sensitive data for comparison (one-way)
 * @param data - The data to hash
 * @returns Hashed data
 */
export function hashSensitiveData(data: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Verify hashed data
 * @param data - The plaintext data
 * @param hashedData - The hashed data to compare against
 * @returns True if match
 */
export function verifyHashedData(data: string, hashedData: string): boolean {
  const parts = hashedData.split(':');
  if (parts.length !== 2) return false;
  
  const salt = Buffer.from(parts[0], 'base64');
  const originalHash = parts[1];
  
  const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
  return hash.toString('base64') === originalHash;
}

/**
 * Mask sensitive data for display (e.g., SSN: ***-**-1234)
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) return '*'.repeat(data.length);
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}

/**
 * Mask bank account number
 */
export function maskBankAccount(accountNumber: string): string {
  if (accountNumber.length <= 4) return '****';
  return '****' + accountNumber.slice(-4);
}

/**
 * Mask SSN (format: ***-**-1234)
 */
export function maskSSN(ssn: string): string {
  // Remove any formatting
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) return '***-**-****';
  return `***-**-${cleaned.slice(-4)}`;
}
