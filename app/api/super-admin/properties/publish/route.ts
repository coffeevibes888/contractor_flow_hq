import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth-guard';

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const { propertyId, isPublished } = await request.json();

    if (!propertyId || typeof isPublished !== 'boolean') {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: { isPublished },
    });

    return NextResponse.json({
      success: true,
      message: isPublished ? 'Property published to listings' : 'Property removed from listings',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update' },
      { status: 500 }
    );
  }
}
