import { prisma } from '@/db/prisma';
import crypto from 'crypto';

/**
 * Verify API key from request headers
 * Usage: const landlord = await verifyApiKey(request);
 */
export async function verifyApiKey(request: Request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, message: 'Missing or invalid Authorization header' };
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer '
  
  if (!apiKey.startsWith('pfhq_')) {
    return { success: false, message: 'Invalid API key format' };
  }

  // Hash the provided key
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Find the API key in database
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      landlord: true,
    },
  });

  if (!apiKeyRecord) {
    return { success: false, message: 'Invalid API key' };
  }

  if (!apiKeyRecord.isActive) {
    return { success: false, message: 'API key is inactive' };
  }

  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return { success: false, message: 'API key has expired' };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    success: true,
    landlord: apiKeyRecord.landlord,
    apiKey: apiKeyRecord,
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: { scopes: string[] }, requiredScope: string): boolean {
  if (apiKey.scopes.includes('*')) return true;
  return apiKey.scopes.includes(requiredScope);
}
