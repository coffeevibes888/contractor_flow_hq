/**
 * Branding GET/PATCH for mobile.
 *
 * GET — returns the landlord's current branding profile.
 * PATCH — updates a subset of fields. Logo / hero images must already be
 *         uploaded (URLs only) — use /api/mobile/upload first.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

const VALID_THEME_COLORS = ['violet', 'emerald', 'blue', 'rose', 'amber', 'cyan', 'orange', 'pink'];

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logoUrl: true,
        companyName: true,
        companyEmail: true,
        companyPhone: true,
        companyAddress: true,
        themeColor: true,
        heroImages: true,
        aboutBio: true,
        aboutPhoto: true,
        aboutGallery: true,
        customDomain: true,
      },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 404 });

    return NextResponse.json({ branding: landlord });
  } catch (e: any) {
    console.error('[mobile/pm/branding GET]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 404 });

    const body = await req.json();
    const data: Record<string, any> = {};

    if (typeof body.companyName    === 'string') data.companyName    = body.companyName.trim().slice(0, 200) || null;
    if (typeof body.companyEmail   === 'string') data.companyEmail   = body.companyEmail.trim().slice(0, 200) || null;
    if (typeof body.companyPhone   === 'string') data.companyPhone   = body.companyPhone.trim().slice(0, 50)  || null;
    if (typeof body.companyAddress === 'string') data.companyAddress = body.companyAddress.trim().slice(0, 500) || null;
    if (typeof body.aboutBio       === 'string') data.aboutBio       = body.aboutBio.trim().slice(0, 5000) || null;
    if (typeof body.logoUrl        === 'string') data.logoUrl        = body.logoUrl || null;
    if (typeof body.aboutPhoto     === 'string') data.aboutPhoto     = body.aboutPhoto || null;

    if (typeof body.themeColor === 'string') {
      const c = body.themeColor.toLowerCase();
      if (!VALID_THEME_COLORS.includes(c)) {
        return NextResponse.json({ error: `Theme color must be one of: ${VALID_THEME_COLORS.join(', ')}` }, { status: 400 });
      }
      data.themeColor = c;
    }

    if (Array.isArray(body.heroImages)) {
      data.heroImages = body.heroImages
        .filter((u: any) => typeof u === 'string' && u.startsWith('http'))
        .slice(0, 3);
    }
    if (Array.isArray(body.aboutGallery)) {
      data.aboutGallery = body.aboutGallery
        .filter((u: any) => typeof u === 'string' && u.startsWith('http'))
        .slice(0, 12);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.landlord.update({
      where: { id: landlord.id },
      data,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        companyName: true,
        companyEmail: true,
        companyPhone: true,
        companyAddress: true,
        themeColor: true,
        heroImages: true,
        aboutBio: true,
        aboutPhoto: true,
        aboutGallery: true,
      },
    });

    return NextResponse.json({ success: true, branding: updated });
  } catch (e: any) {
    console.error('[mobile/pm/branding PATCH]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
