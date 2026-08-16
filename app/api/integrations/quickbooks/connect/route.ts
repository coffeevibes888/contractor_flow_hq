import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getQuickBooksAuthorizationUrl } from '@/lib/services/quickbooks-service';

const randomState = () => {
  // small, url-safe random string
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');

    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'Landlord ID required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: {
        id: landlordId,
        ownerUserId: session.user.id,
      },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const state = randomState();
    const url = await getQuickBooksAuthorizationUrl({ landlordId, state });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('QuickBooks connect error:', error);
    return NextResponse.json({ success: false, message: 'Connect failed' }, { status: 500 });
  }
}
