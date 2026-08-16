/**
 * Lease templates — mobile-facing endpoints that mirror the website's
 * /api/lease-templates routes but use the mobile-token auth pattern so the
 * app can list, create, and assign lease templates without a session.
 *
 * GET  /api/mobile/pm/lease-templates
 *      Returns all templates owned by the authed PM's landlord, including
 *      the properties each template is assigned to.
 *
 * POST /api/mobile/pm/lease-templates
 *      Body: { name, type: 'uploaded_pdf' | 'builder', pdfUrl?,
 *              builderConfig?, isDefault?, propertyIds? }
 *      Creates a lease template. Re-uses the same `lease-template.service`
 *      helpers the website calls so behavior stays in sync.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import { createTemplate, listTemplates } from '@/lib/services/lease-template.service';

async function landlordFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true },
  });
  return landlord ? { ...landlord, payload } : null;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId') || undefined;

    const templates = await listTemplates(ctx.id, propertyId);
    return NextResponse.json({ templates });
  } catch (e: any) {
    console.error('mobile lease-templates GET', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      type?: 'uploaded_pdf' | 'builder';
      pdfUrl?: string;
      builderConfig?: unknown;
      signatureFields?: unknown;
      mergeFields?: unknown;
      isDefault?: boolean;
      propertyIds?: string[];
    };

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!body.type || !['uploaded_pdf', 'builder'].includes(body.type)) {
      return NextResponse.json(
        { error: 'type must be "uploaded_pdf" or "builder"' },
        { status: 400 },
      );
    }
    if (body.type === 'uploaded_pdf' && !body.pdfUrl) {
      return NextResponse.json(
        { error: 'pdfUrl is required for uploaded PDF templates' },
        { status: 400 },
      );
    }

    // Verify any provided propertyIds belong to this landlord before assigning.
    let propertyIds: string[] = [];
    if (Array.isArray(body.propertyIds) && body.propertyIds.length > 0) {
      const valid = await prisma.property.findMany({
        where: {
          id: { in: body.propertyIds },
          landlordId: ctx.id,
          status: { not: 'deleted' },
        },
        select: { id: true },
      });
      propertyIds = valid.map((p) => p.id);
    }

    const template = await createTemplate({
      landlordId: ctx.id,
      name: body.name.trim(),
      type: body.type,
      isDefault: body.isDefault ?? false,
      builderConfig: body.builderConfig as any,
      pdfUrl: body.pdfUrl,
      signatureFields: body.signatureFields as any,
      mergeFields: body.mergeFields as any,
      propertyIds,
    });

    return NextResponse.json({ template });
  } catch (e: any) {
    console.error('mobile lease-templates POST', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
