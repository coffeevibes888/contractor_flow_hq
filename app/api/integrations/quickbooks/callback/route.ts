import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { exchangeQuickBooksCode } from '@/lib/services/quickbooks-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    if (!state) {
      return NextResponse.json({ success: false, message: 'Missing state' }, { status: 400 });
    }

    const conn = await (prisma as any).quickBooksConnection.findFirst({
      where: { oauthState: state },
      include: { landlord: true },
    });

    if (!conn?.landlordId || !conn.landlord) {
      return NextResponse.json({ success: false, message: 'Invalid state' }, { status: 400 });
    }

    if (conn.landlord.ownerUserId !== session.user.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await exchangeQuickBooksCode({ landlordId: conn.landlordId, url: request.url });

    const redirectTo = `/admin/analytics`;
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.json({ success: false, message: 'Callback failed' }, { status: 500 });
  }
}
