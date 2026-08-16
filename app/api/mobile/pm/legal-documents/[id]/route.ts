/**
 * Legal documents — single doc operations.
 *
 *   DELETE /api/mobile/pm/legal-documents/:id
 *          Soft-deletes by setting isActive = false. Matches the web's
 *          /api/legal-documents/:id behavior so historical leases still
 *          resolve their template references.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const doc = await prisma.legalDocument.findFirst({
      where: { id, landlordId: landlord.id },
      select: { id: true },
    });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.legalDocument.update({
      where: { id: doc.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('mobile legal-document delete', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
