import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { randomBytes } from 'crypto';

function generateCode(): string {
  // 8-char uppercase alphanumeric, easy to type if needed
  return randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
}

/**
 * POST /api/landlord/invite-code/generate
 *
 * Body: { propertyId?: string }
 *
 * Returns an existing active code for this landlord+property combo (or a new
 * one) so the landlord always gets the same QR unless they explicitly want a
 * fresh one. Also returns the full invite URL that should be encoded in the QR.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const landlordResult = await getOrCreateCurrentLandlord();
    if (!landlordResult.success || !landlordResult.landlord) {
      return NextResponse.json(
        { success: false, message: landlordResult.message || 'Landlord not found' },
        { status: 400 }
      );
    }

    const landlord = landlordResult.landlord;

    if (landlord.ownerUserId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const propertyId: string | undefined = body.propertyId || undefined;

    // Validate property belongs to this landlord when provided
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: propertyId, landlordId: landlord.id, status: { not: 'deleted' } },
        select: { id: true },
      });
      if (!property) {
        return NextResponse.json(
          { success: false, message: 'Property not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Reuse an existing active code for this landlord+property pair
    const existing = await prisma.landlordInviteCode.findFirst({
      where: {
        landlordId: landlord.id,
        propertyId: propertyId ?? null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const record =
      existing ??
      (await prisma.landlordInviteCode.create({
        data: {
          landlordId: landlord.id,
          propertyId: propertyId ?? null,
          code: generateCode(),
          isActive: true,
        },
      }));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SERVER_URL || 'http://localhost:3000';
    const joinUrl = `${baseUrl}/join/${record.code}`;

    return NextResponse.json({ success: true, code: record.code, joinUrl });
  } catch (error) {
    console.error('Error generating invite code:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate invite code' }, { status: 500 });
  }
}
