/**
 * POST /api/mobile/pm/legal-documents/set-default
 *
 * Body: { documentId, propertyId }
 *
 * Mobile equivalent of /api/legal-documents/set-default. Sets the given
 * legal document as the default lease for a property. Both must belong to
 * the authed PM's landlord.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

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

    const { documentId, propertyId } = (await req.json().catch(() => ({}))) as {
      documentId?: string;
      propertyId?: string;
    };
    if (!documentId || !propertyId) {
      return NextResponse.json(
        { error: 'documentId and propertyId are required' },
        { status: 400 },
      );
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const [document, property] = await Promise.all([
      prisma.legalDocument.findFirst({
        where: { id: documentId, landlordId: landlord.id },
        select: { id: true, name: true },
      }),
      prisma.property.findFirst({
        where: { id: propertyId, landlordId: landlord.id, status: { not: 'deleted' } },
        select: { id: true, name: true },
      }),
    ]);
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    await prisma.property.update({
      where: { id: property.id },
      data: { defaultLeaseDocumentId: document.id },
    });

    return NextResponse.json({
      success: true,
      message: `"${document.name}" set as default lease for "${property.name}"`,
    });
  } catch (e: any) {
    console.error('mobile legal-document set-default', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
