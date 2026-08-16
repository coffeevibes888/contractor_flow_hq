import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

/**
 * POST /api/public/lookup-landlord
 *
 * Body: { query: string }
 *
 * Accepts an invite code, landlord email, or landlord phone number and returns
 * enough info to display a confirmation card to the tenant (landlord name,
 * property name if the code is property-pinned).
 *
 * Deliberately returns minimal data — no landlord IDs, no internal slugs.
 * The full landlordId is returned only for the sign-up flow under a separate
 * key so it can be passed as an opaque hidden field.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = (body.query || '').trim();

    if (!query) {
      return NextResponse.json({ found: false, error: 'Query is required' }, { status: 400 });
    }

    // ── 1. Try invite code (8-char alphanumeric) ──────────────────────────
    const codeMatch = /^[A-Z0-9]{6,10}$/i.test(query.replace(/[- ]/g, ''));
    if (codeMatch) {
      const normalizedCode = query.replace(/[- ]/g, '').toUpperCase();
      const record = await prisma.landlordInviteCode.findFirst({
        where: {
          code: normalizedCode,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          landlord: { select: { id: true, owner: { select: { name: true } } } },
          property: { select: { name: true, slug: true } },
        },
      });

      if (record) {
        return NextResponse.json({
          found: true,
          method: 'invite_code',
          inviteCode: normalizedCode,
          landlordName: record.landlord.owner?.name || 'Your Landlord',
          propertyName: record.property?.name ?? null,
          propertySlug: record.property?.slug ?? null,
        });
      }
    }

    // ── 2. Try email ──────────────────────────────────────────────────────
    if (query.includes('@')) {
      const landlord = await prisma.landlord.findFirst({
        where: {
          owner: { email: { equals: query, mode: 'insensitive' } },
        },
        select: { id: true, owner: { select: { name: true } } },
      });

      if (landlord) {
        return NextResponse.json({
          found: true,
          method: 'email',
          landlordEmail: query.toLowerCase(),
          landlordName: landlord.owner?.name || 'Your Landlord',
          propertyName: null,
          propertySlug: null,
        });
      }
    }

    // ── 3. Try phone number ───────────────────────────────────────────────
    const phoneDigits = query.replace(/\D/g, '');
    if (phoneDigits.length >= 10) {
      const e164 =
        phoneDigits.length === 10
          ? `+1${phoneDigits}`
          : phoneDigits.length === 11 && phoneDigits.startsWith('1')
          ? `+${phoneDigits}`
          : `+${phoneDigits}`;

      const landlord = await prisma.landlord.findFirst({
        where: {
          owner: { phoneNumber: { in: [phoneDigits, e164, query] } },
        },
        select: { id: true, owner: { select: { name: true } } },
      });

      if (landlord) {
        return NextResponse.json({
          found: true,
          method: 'phone',
          landlordPhone: e164,
          landlordName: landlord.owner?.name || 'Your Landlord',
          propertyName: null,
          propertySlug: null,
        });
      }
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error('Landlord lookup error:', error);
    return NextResponse.json({ found: false, error: 'Lookup failed' }, { status: 500 });
  }
}
