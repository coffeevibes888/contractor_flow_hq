import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { fetchQuickBooksCompanyInfo } from '@/lib/services/quickbooks-service';

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

    const conn = await (prisma as any).quickBooksConnection.findUnique({
      where: { landlordId },
      select: {
        connectedAt: true,
        realmId: true,
        accessTokenEncrypted: true,
        refreshTokenEncrypted: true,
        accessTokenExpiresAt: true,
      },
    });

    const connected = Boolean(
      conn?.connectedAt && conn.realmId && conn.accessTokenEncrypted && conn.refreshTokenEncrypted
    );

    if (!connected) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
        },
      });
    }

    let companyInfo: any = null;
    try {
      companyInfo = await fetchQuickBooksCompanyInfo({ landlordId });
    } catch (e) {
      // token might be invalid/revoked; still report connected but surface error
      console.error('QuickBooks company info fetch failed:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        realmId: conn?.realmId,
        connectedAt: conn?.connectedAt,
        companyInfo,
      },
    });
  } catch (error) {
    console.error('QuickBooks status error:', error);
    return NextResponse.json({ success: false, message: 'Status failed' }, { status: 500 });
  }
}
