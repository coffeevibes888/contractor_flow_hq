import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';

const ALLOWED_ROLES = ['admin', 'superAdmin'];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !ALLOWED_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const { action } = body as { action: 'publish' | 'unpublish' | 'verify_address' | 'unverify_address' };

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    return NextResponse.json({ error: 'Unable to determine landlord' }, { status: 400 });
  }

  const property = await prisma.property.findFirst({
    where: { id, landlordId: landlordResult.landlord.id },
    include: { units: { select: { images: true } } },
  });

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  if (action === 'publish') {
    // Enforce: must have at least one photo before publishing
    const hasPhotos = property.units.some((u) => u.images && u.images.length > 0);
    if (!hasPhotos) {
      return NextResponse.json(
        { error: 'Cannot publish without photos', message: 'This property has no photos. Please add at least one photo before publishing.' },
        { status: 400 }
      );
    }

    await prisma.property.update({
      where: { id },
      data: { isPublished: true },
    });
    return NextResponse.json({ success: true, message: 'Property is now live in listings.' });
  }

  if (action === 'unpublish') {
    await prisma.property.update({
      where: { id },
      data: { isPublished: false },
    });
    return NextResponse.json({ success: true, message: 'Property removed from public listings.' });
  }

  if (action === 'verify_address') {
    await prisma.property.update({
      where: { id },
      data: { addressVerified: true },
    });
    return NextResponse.json({ success: true, message: 'Address marked as verified.' });
  }

  if (action === 'unverify_address') {
    await prisma.property.update({
      where: { id },
      data: { addressVerified: false },
    });
    return NextResponse.json({ success: true, message: 'Address verification removed.' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
