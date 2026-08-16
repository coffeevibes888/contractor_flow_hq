import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// DELETE - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    // Verify ownership and delete
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.keyId,
        landlordId: landlord.id,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id: params.keyId },
    });

    return NextResponse.json({ success: true, message: 'API key deleted' });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
