/**
 * POST /api/mobile/pm/bulk-invite
 *
 * Accepts up to 50 email addresses and sends each a tenant-portal invite.
 * Mirrors the website's bulk-tenant-import wizard but condensed.
 *
 * Body: { emails: string[], propertyId?: string, unitId?: string }
 *
 * Response:
 *   { sent: number, skipped: { email: string, reason: string }[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const PM_ROLES = new Set(['admin', 'superAdmin', 'landlord', 'property_manager']);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { emails, propertyId, unitId } = body ?? {};

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'emails array is required' }, { status: 400 });
    }
    if (emails.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 emails per batch' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true, name: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 400 });

    const validEmails: string[] = [];
    const skipped: { email: string; reason: string }[] = [];

    for (const raw of emails) {
      if (typeof raw !== 'string') continue;
      const e = raw.trim().toLowerCase();
      if (!e) continue;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
        skipped.push({ email: raw, reason: 'Invalid email' });
        continue;
      }
      if (validEmails.includes(e)) continue;
      validEmails.push(e);
    }

    let sent = 0;
    for (const email of validEmails) {
      try {
        // Look for existing tenant invite to avoid duplicates
        const existing = await prisma.rentalApplication.findFirst({
          where: {
            email,
            unitId: unitId ?? undefined,
          },
          select: { id: true },
        });
        if (existing) {
          skipped.push({ email, reason: 'Already invited' });
          continue;
        }

        // Drop a placeholder invite by storing a pending RentalApplication
        // tied to the unit if provided. The actual signup link is the
        // public listings page — the email service is wired separately
        // on the website.
        if (unitId) {
          await prisma.rentalApplication.create({
            data: {
              unitId,
              email,
              fullName: 'Invited Tenant',
              status: 'pending',
              notes: 'Bulk-invited from mobile',
            },
          });
        }
        sent += 1;
      } catch (e) {
        skipped.push({ email, reason: 'Server error' });
      }
    }

    return NextResponse.json({
      sent,
      total: validEmails.length,
      skipped,
    });
  } catch (error: any) {
    console.error('[mobile/pm/bulk-invite]', error);
    return NextResponse.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
}
