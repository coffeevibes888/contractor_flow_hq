/**
 * DELETE /api/mobile/pm/contractors/:id
 * PATCH  /api/mobile/pm/contractors/:id
 *
 * Mobile-token equivalents of the website's contractor directory edit/delete
 * actions. Only contractors owned by the authed landlord may be touched.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.contractor.findFirst({
      where: { id, landlordId: ctx.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      phone?: string;
      specialties?: string[];
      notes?: string;
    };

    const data: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.email === 'string' && body.email.trim()) data.email = body.email.trim().toLowerCase();
    if (typeof body.phone === 'string') data.phone = body.phone.trim() || null;
    if (Array.isArray(body.specialties)) data.specialties = body.specialties;
    if (typeof body.notes === 'string') data.notes = body.notes.trim() || null;

    try {
      const contractor = await prisma.contractor.update({ where: { id: existing.id }, data });
      return NextResponse.json({ contractor });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return NextResponse.json(
          { error: 'A contractor with this email already exists in your directory' },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (e: any) {
    console.error('mobile pm/contractors PATCH', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.contractor.findFirst({
      where: { id, landlordId: ctx.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.contractor.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('mobile pm/contractors DELETE', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
