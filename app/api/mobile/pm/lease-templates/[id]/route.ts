/**
 * DELETE /api/mobile/pm/lease-templates/:id
 *
 * Deletes a lease template owned by the authed PM's landlord. Mirrors the
 * website's DELETE /api/lease-templates/:id route (cascade also removes
 * any property assignments via the service helper).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';
import { deleteTemplate, getTemplateById, updateTemplate } from '@/lib/services/lease-template.service';

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    // Ownership check before delegating to the shared service.
    const existing = await getTemplateById(id);
    if (!existing || existing.landlordId !== ctx.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('mobile lease-templates DELETE', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/mobile/pm/lease-templates/:id
 *
 * Body: { name?, isDefault?, propertyIds? }
 *
 * Used for "set as default" + assign-to-properties from the mobile app.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await getTemplateById(id);
    if (!existing || existing.landlordId !== ctx.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      isDefault?: boolean;
      propertyIds?: string[];
    };

    let propertyIds: string[] | undefined;
    if (Array.isArray(body.propertyIds)) {
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

    const updated = await updateTemplate(id, {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      isDefault: typeof body.isDefault === 'boolean' ? body.isDefault : undefined,
      propertyIds,
    });

    return NextResponse.json({ template: updated });
  } catch (e: any) {
    console.error('mobile lease-templates PATCH', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
