/**
 * Fiscal Periods API
 * GET  ?landlordId=  — list all periods
 * POST              — create a new period (year/month)
 * PATCH [id]        — open/lock/close a period
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingManagement } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const landlordId = searchParams.get('landlordId');
    if (!landlordId)
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const periods = await prisma.fiscalPeriod.findMany({
      where: { landlordId },
      orderBy: { startDate: 'desc' },
      include: {
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json({ success: true, data: periods });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { landlordId, year, month } = body;

    if (!landlordId || !year || !month)
      return NextResponse.json({ success: false, message: 'landlordId, year, and month are required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Check for existing
    const existing = await prisma.fiscalPeriod.findFirst({
      where: { landlordId, startDate },
    });
    if (existing)
      return NextResponse.json({ success: false, message: 'A period for that month already exists' }, { status: 409 });

    const period = await prisma.fiscalPeriod.create({
      data: { landlordId, startDate, endDate, status: 'open' },
    });

    return NextResponse.json({ success: true, data: period }, { status: 201 });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
