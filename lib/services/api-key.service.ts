/**
 * API Key Service
 * 
 * Handles creation, validation, and management of API keys for Enterprise tier.
 * Keys are hashed using SHA-256 before storage for security.
 */

import { prisma } from '@/db/prisma';
import { createHash, randomBytes } from 'crypto';
import { hasFeatureAccess, normalizeTier } from '@/lib/config/subscription-tiers';

// API Key Scopes
export const API_SCOPES = {
  // Properties
  'properties:read': 'Read property information',
  'properties:write': 'Create and update properties',
  
  // Units
  'units:read': 'Read unit information',
  'units:write': 'Create and update units',
  
  // Tenants
  'tenants:read': 'Read tenant information',
  'tenants:write': 'Manage tenant records',
  
  // Leases
  'leases:read': 'Read lease information',
  'leases:write': 'Create and manage leases',
  
  // Payments
  'payments:read': 'Read payment history',
  'payments:write': 'Process payments',
  
  // Maintenance
  'maintenance:read': 'Read maintenance tickets',
  'maintenance:write': 'Create and update tickets',
  
  // Applications
  'applications:read': 'Read rental applications',
  'applications:write': 'Process applications',
  
  // Work Orders
  'work_orders:read': 'Read work orders',
  'work_orders:write': 'Manage work orders',
  
  // Webhooks
  'webhooks:read': 'Read webhook configurations',
  'webhooks:write': 'Manage webhooks',
  
  // Analytics
  'analytics:read': 'Read analytics data',
} as const;

export type ApiScope = keyof typeof API_SCOPES;

interface CreateApiKeyParams {
  landlordId: string;
  name: string;
  scopes: ApiScope[];
  expiresAt?: Date;
  rateLimit?: number;
  rateLimitWindow?: number;
}

interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: {
    id: string;
    landlordId: string;
    name: string;
    scopes: string[];
  };
  error?: string;
}

/**
 * Generate a secure API key
 * Format: pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (40 chars total)
 */
function generateApiKey(): string {
  const prefix = 'pk_live_';
  const randomPart = randomBytes(24).toString('base64url').slice(0, 32);
  return `${prefix}${randomPart}`;
}

/**
 * Hash an API key using SHA-256
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Extract the prefix from an API key for identification
 */
function getKeyPrefix(key: string): string {
  return key.slice(0, 12);
}

/**
 * Check if a landlord has API access (Enterprise tier)
 */
export async function hasApiAccess(landlordId: string): Promise<boolean> {
  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
    select: { subscriptionTier: true },
  });

  if (!landlord) return false;

  const tier = normalizeTier(landlord.subscriptionTier);
  return hasFeatureAccess(tier, 'apiAccess');
}

/**
 * Create a new API key
 * Returns the raw key (only shown once) and the stored key record
 */
export async function createApiKey(params: CreateApiKeyParams) {
  const { landlordId, name, scopes, expiresAt, rateLimit = 1000, rateLimitWindow = 3600 } = params;

  // Verify Enterprise tier access
  const hasAccess = await hasApiAccess(landlordId);
  if (!hasAccess) {
    throw new Error('API access requires Enterprise subscription');
  }

  // Generate the key
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);

  // Store the hashed key
  const apiKey = await prisma.apiKey.create({
    data: {
      landlordId,
      name,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt,
      rateLimit,
      rateLimitWindow,
    },
  });

  // Return the raw key (only time it's available) and the record
  return {
    key: rawKey, // This is the only time the raw key is available!
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    },
  };
}

/**
 * Validate an API key and return the associated landlord
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidationResult> {
  if (!key || !key.startsWith('pk_live_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      landlord: {
        select: { subscriptionTier: true },
      },
    },
  });

  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is disabled' };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Verify landlord still has Enterprise access
  const tier = normalizeTier(apiKey.landlord.subscriptionTier);
  if (!hasFeatureAccess(tier, 'apiAccess')) {
    return { valid: false, error: 'API access requires Enterprise subscription' };
  }

  // Update last used timestamp (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {}); // Ignore errors

  return {
    valid: true,
    apiKey: {
      id: apiKey.id,
      landlordId: apiKey.landlordId,
      name: apiKey.name,
      scopes: apiKey.scopes,
    },
  };
}

/**
 * Check if an API key has a specific scope
 */
export function hasScope(apiKeyScopes: string[], requiredScope: ApiScope): boolean {
  return apiKeyScopes.includes(requiredScope);
}

/**
 * List all API keys for a landlord (without the actual key values)
 */
export async function listApiKeys(landlordId: string) {
  return prisma.apiKey.findMany({
    where: { landlordId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      rateLimitWindow: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(landlordId: string, keyId: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, landlordId },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  return prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(landlordId: string, keyId: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, landlordId },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  return prisma.apiKey.delete({
    where: { id: keyId },
  });
}

/**
 * Update API key settings
 */
export async function updateApiKey(
  landlordId: string,
  keyId: string,
  data: {
    name?: string;
    scopes?: ApiScope[];
    isActive?: boolean;
    rateLimit?: number;
    rateLimitWindow?: number;
  }
) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, landlordId },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  return prisma.apiKey.update({
    where: { id: keyId },
    data,
  });
}
