import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { rentRoll } from '@/lib/accounting';
import { handleAccountingApiError } from '@/lib/accounting/api-error';
// No tier gate — Rent Roll is available on all plans including Starter

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date();
    const rows = await rentRoll(landlordId, asOf);

    const totalUnits = rows.length;
    const occupied = rows.filter((r) => r.status === 'occupied').length;
    const totalActualRent = rows.reduce((s, r) => s + r.actualRent, 0);
    const totalMarketRent = rows.reduce((s, r) => s + r.marketRent, 0);
    const totalBalanceOwed = rows.reduce((s, r) => s + r.balanceOwed, 0);

    return NextResponse.json({
      success: true,
      data: {
        rows,
        summary: {
          totalUnits,
          occupied,
          occupancyRate: totalUnits > 0 ? (occupied / totalUnits) * 100 : 0,
          totalActualRent,
          totalMarketRent,
          rentUpside: totalActualRent - totalMarketRent,
          totalBalanceOwed,
        },
        asOf,
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
