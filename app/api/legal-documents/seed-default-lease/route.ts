import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ message: 'Landlord account not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({} as any));
    const state = typeof body?.state === 'string' && body.state ? body.state : 'NV';

    const existing = await prisma.legalDocument.findFirst({
      where: {
        landlordId: landlord.id,
        isActive: true,
        isTemplate: true,
        type: 'lease',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      return NextResponse.json({ success: true, document: existing, created: false });
    }

    const created = await prisma.legalDocument.create({
      data: {
        landlordId: landlord.id,
        name: `${state} Standard Residential Lease (DocuSign Ready)`,
        type: 'lease',
        category: 'state_template',
        state,
        description: 'System-provided lease template with DocuSign initials and signature anchors.',
        isTemplate: true,
        isActive: true,
        fileType: 'html',
      },
    });

    const updated = await prisma.legalDocument.update({
      where: { id: created.id },
      data: { fileUrl: `/api/legal-documents/${created.id}/preview` },
    });

    return NextResponse.json({ success: true, document: updated, created: true });
  } catch (error) {
    console.error('Failed to seed default lease template:', error);
    return NextResponse.json({ message: 'Failed to seed default lease template' }, { status: 500 });
  }
}
