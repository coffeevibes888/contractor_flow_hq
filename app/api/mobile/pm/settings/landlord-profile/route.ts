/**
 * Mobile PM landlord profile.
 *
 * GET  /api/mobile/pm/settings/landlord-profile  — returns the same
 *       landlord row the website's Profile tab edits, plus the user
 *       email + verification status used by the EmailVerifyCard.
 * PUT  /api/mobile/pm/settings/landlord-profile  — mirrors
 *       `/api/landlord/profile` but uses mobile-token auth.
 *
 * Body for PUT:
 *   { name?, companyName?, companyEmail?, companyPhone?,
 *     companyAddress?, aboutPhoto?, logoUrl? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

async function ctxFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  return { userId: payload.userId, role: payload.role };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [user, landlord] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true, email: true, emailVerified: true, twoFactorEnabled: true },
      }),
      prisma.landlord.findFirst({
        where: { ownerUserId: ctx.userId },
        select: {
          id: true,
          name: true,
          companyName: true,
          companyEmail: true,
          companyPhone: true,
          companyAddress: true,
          logoUrl: true,
          aboutPhoto: true,
        },
      }),
    ]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      user: {
        email: user.email,
        emailVerified: !!user.emailVerified,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
      landlord: landlord
        ? {
            id: landlord.id,
            name: landlord.name ?? '',
            companyName: landlord.companyName ?? '',
            companyEmail: landlord.companyEmail ?? '',
            companyPhone: landlord.companyPhone ?? '',
            companyAddress: landlord.companyAddress ?? '',
            logoUrl: landlord.logoUrl ?? null,
            aboutPhoto: landlord.aboutPhoto ?? null,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[mobile/pm/settings/landlord-profile GET]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await ctxFromToken(req);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      companyName?: string;
      companyEmail?: string;
      companyPhone?: string;
      companyAddress?: string;
      logoUrl?: string | null;
      aboutPhoto?: string | null;
    };

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: ctx.userId },
      select: { id: true, name: true },
    });
    if (!landlord) return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });

    const updated = await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        name: body.name ?? landlord.name,
        companyName: body.companyName ?? null,
        companyEmail: body.companyEmail ?? null,
        companyPhone: body.companyPhone ?? null,
        companyAddress: body.companyAddress ?? null,
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
        ...(body.aboutPhoto !== undefined ? { aboutPhoto: body.aboutPhoto } : {}),
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        companyEmail: true,
        companyPhone: true,
        companyAddress: true,
        logoUrl: true,
        aboutPhoto: true,
      },
    });

    return NextResponse.json({ success: true, landlord: updated });
  } catch (error: any) {
    console.error('[mobile/pm/settings/landlord-profile PUT]', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to update profile' }, { status: 500 });
  }
}
