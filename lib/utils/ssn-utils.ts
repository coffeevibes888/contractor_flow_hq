import { decryptField } from '@/lib/encrypt';
import { requireAdmin } from '@/lib/auth-guard';

/**
 * Decrypt SSN for admin viewing
 * Only accessible by admin users
 */
export async function getDecryptedSsn(encryptedSsn: string | null): Promise<string | null> {
  // Ensure user is admin
  await requireAdmin();

  if (!encryptedSsn) {
    return null;
  }

  try {
    const decrypted = await decryptField(encryptedSsn);
    return decrypted;
  } catch (error) {
    // Log error but don't expose details
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to decrypt SSN:', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }
}

/**
 * Format SSN for display (XXX-XX-XXXX)
 */
export function formatSsn(ssn: string | null): string {
  if (!ssn) return '—';
  
  // Remove any existing formatting
  const cleaned = ssn.replace(/\D/g, '');
  
  if (cleaned.length !== 9) {
    return ssn; // Return as-is if not 9 digits
  }
  
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
}

/**
 * Mask SSN for display (XXX-XX-1234)
 */
export function maskSsn(ssn: string | null): string {
  if (!ssn) return '—';
  
  const cleaned = ssn.replace(/\D/g, '');
  
  if (cleaned.length !== 9) {
    return '***-**-****';
  }
  
  return `***-**-${cleaned.slice(5, 9)}`;
}

