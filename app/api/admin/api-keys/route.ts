/**
 * API Keys Management Endpoint
 * 
 * GET /api/admin/api-keys - List all API keys
 * POST /api/admin/api-keys - Create a new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  createApiKey,
  listApiKeys,
  hasApiAccess,
  API_SCOPES,
  ApiScope,
} from '@/lib/services/api-key.service';

// GET /api/admin/api-keys
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    // Check Enterprise access
    const hasAccess = await hasApiAccess(landlord.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'API access requires Enterprise subscription' },
        { status: 403 }
      );
    }

    const apiKeys = await listApiKeys(landlord.id);

    return NextResponse.json({
      apiKeys,
      availableScopes: API_SCOPES,
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    if (!body.scopes || !Array.isArray(body.scopes) || body.scopes.length === 0) {
      return NextResponse.json(
        { error: 'At least one scope is required' },
        { status: 400 }
      );
    }

    // Validate scopes
    const validScopes = Object.keys(API_SCOPES);
    for (const scope of body.scopes) {
      if (!validScopes.includes(scope)) {
        return NextResponse.json(
          { error: `Invalid scope: ${scope}` },
          { status: 400 }
        );
      }
    }

    const result = await createApiKey({
      landlordId: landlord.id,
      name: body.name,
      scopes: body.scopes as ApiScope[],
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      rateLimit: body.rateLimit,
      rateLimitWindow: body.rateLimitWindow,
    });

    return NextResponse.json({
      message: 'API key created successfully',
      key: result.key, // Only returned once!
      apiKey: result.apiKey,
      warning: 'Save this key now. It will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    const message = error instanceof Error ? error.message : 'Failed to create API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
