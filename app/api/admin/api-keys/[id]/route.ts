/**
 * Single API Key Management Endpoint
 * 
 * PATCH /api/admin/api-keys/:id - Update API key
 * DELETE /api/admin/api-keys/:id - Delete API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  updateApiKey,
  deleteApiKey,
  revokeApiKey,
  API_SCOPES,
  ApiScope,
} from '@/lib/services/api-key.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/api-keys/:id
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    const body = await req.json();

    // Validate scopes if provided
    if (body.scopes) {
      const validScopes = Object.keys(API_SCOPES);
      for (const scope of body.scopes) {
        if (!validScopes.includes(scope)) {
          return NextResponse.json(
            { error: `Invalid scope: ${scope}` },
            { status: 400 }
          );
        }
      }
    }

    const apiKey = await updateApiKey(landlord.id, id, {
      name: body.name,
      scopes: body.scopes as ApiScope[],
      isActive: body.isActive,
      rateLimit: body.rateLimit,
      rateLimitWindow: body.rateLimitWindow,
    });

    return NextResponse.json({
      message: 'API key updated successfully',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        rateLimit: apiKey.rateLimit,
        rateLimitWindow: apiKey.rateLimitWindow,
      },
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    const message = error instanceof Error ? error.message : 'Failed to update API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/api-keys/:id
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get landlord for this user
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }

    await deleteApiKey(landlord.id, id);

    return NextResponse.json({
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete API key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
