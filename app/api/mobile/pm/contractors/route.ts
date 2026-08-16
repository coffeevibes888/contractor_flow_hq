/**
 * In-house contractor directory — mobile-token equivalents of the website's
 * /api/contractors GET/POST. Returns and creates Contractor records owned
 * by the authed PM's landlord.
 *
 * GET  /api/mobile/pm/contractors?q=
 * POST /api/mobile/pm/contractors
 *      Body: { name, email, phone?, specialties?, notes? }
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

export async function GET(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const search = req.nextUrl.searchParams.get('q')?.trim();

    const contractors = await prisma.contractor.findMany({
      where: {
        landlordId: ctx.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { specialties: { hasSome: [search] } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { workOrders: true } },
      },
    });

    return NextResponse.json({
      contractors: contractors.map((c) => ({
        id: c.id,
        name: c.name,
        businessName: c.businessName,
        email: c.email,
        phone: c.phone,
        specialties: c.specialties,
        notes: c.notes,
        userId: c.userId,
        isPaymentReady: c.isPaymentReady,
        bankAccountLast4: c.bankAccountLast4,
        bankName: c.bankName,
        createdAt: c.createdAt,
        workOrderCount: c._count.workOrders,
      })),
    });
  } catch (e: any) {
    console.error('mobile pm/contractors GET', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await landlordFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      phone?: string;
      specialties?: string[];
      notes?: string;
    };

    if (!body.name?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
    }

    try {
      const contractor = await prisma.contractor.create({
        data: {
          landlordId: ctx.id,
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          phone: body.phone?.trim() || null,
          specialties: Array.isArray(body.specialties) ? body.specialties : [],
          notes: body.notes?.trim() || null,
        },
      });
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
    console.error('mobile pm/contractors POST', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
