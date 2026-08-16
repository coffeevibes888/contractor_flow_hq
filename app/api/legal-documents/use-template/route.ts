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

    const body = await req.json();
    const { name, type, state, description } = body;

    if (!name || !type) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Create document from template
    const document = await prisma.legalDocument.create({
      data: {
        landlordId: landlord.id,
        name,
        type,
        category: 'state_template',
        state: state || null,
        description: description || null,
        isTemplate: true,
        isActive: true,
        fileType: 'html',
      },
    });

    const updated = await prisma.legalDocument.update({
      where: { id: document.id },
      data: {
        fileUrl: `/api/legal-documents/${document.id}/preview`,
      },
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error) {
    console.error('Failed to use template:', error);
    return NextResponse.json({ message: 'Failed to add template' }, { status: 500 });
  }
}
