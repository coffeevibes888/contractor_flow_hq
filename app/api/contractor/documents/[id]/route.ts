import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

// DELETE — delete a document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { id } = await params;
    const db = prisma as any;

    const document = await db.contractorDocument.findUnique({
      where: { id },
      select: { id: true, contractorId: true },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (document.contractorId !== contractorAuth.contractorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.contractorDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contractor/documents/[id]', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

// PATCH — update a document (set as default template, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { id } = await params;
    const db = prisma as any;
    const body = await req.json();

    const document = await db.contractorDocument.findUnique({
      where: { id },
      select: { id: true, contractorId: true },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (document.contractorId !== contractorAuth.contractorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If setting as default, unset all other defaults first
    if (body.isDefault === true) {
      await db.contractorDocument.updateMany({
        where: { contractorId: contractorAuth.contractorId, isTemplate: true, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await db.contractorDocument.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isTemplate !== undefined && { isTemplate: body.isTemplate }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.category !== undefined && { category: body.category }),
      },
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    console.error('PATCH /api/contractor/documents/[id]', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
