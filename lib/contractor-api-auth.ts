import { prisma } from '@/db/prisma';
import crypto from 'crypto';

/**
 * Verify a contractor API key from request headers.
 * Keys start with "pfhq_c_" to distinguish from PM keys ("pfhq_").
 */
export async function verifyContractorApiKey(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, message: 'Missing or invalid Authorization header' };
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey.startsWith('pfhq_c_')) {
    return { success: false, message: 'Invalid contractor API key format. Keys must start with pfhq_c_' };
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const record = await prisma.contractorApiKey.findUnique({
    where: { keyHash },
    include: { contractor: true },
  });

  if (!record) return { success: false, message: 'Invalid API key' };
  if (!record.isActive) return { success: false, message: 'API key is inactive' };
  if (record.expiresAt && record.expiresAt < new Date()) {
    return { success: false, message: 'API key has expired' };
  }

  await prisma.contractorApiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return { success: true, contractor: record.contractor, apiKey: record };
}

export function hasContractorScope(apiKey: { scopes: string[] }, requiredScope: string): boolean {
  if (apiKey.scopes.includes('*')) return true;
  return apiKey.scopes.includes(requiredScope);
}

/** Generate a new contractor API key — returns the raw key (shown once) and the hash to store */
export function generateContractorApiKey(): { raw: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString('hex');
  const raw = `pfhq_c_${random}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.substring(0, 12);
  return { raw, hash, prefix };
}
