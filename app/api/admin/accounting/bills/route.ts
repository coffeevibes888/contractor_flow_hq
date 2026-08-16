/**
 * Bills / Accounts Payable API
 * Uses the Expense model as the bill record — vendor bills are expenses
 * with status tracking (draft → approved → paid).
 * GET  ?landlordId=&status=&propertyId=
 * POST  { landlordId, vendor, amount, category, description, dueDate, propertyId }
 * PATCH [id]  { status, paidAt, ... }
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

    const propertyId = searchParams.get('propertyId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

    const bills = await prisma.expense.findMany({
      where: {
        landlordId,
        ...(propertyId ? { propertyId } : {}),
        // We use a flag in description prefix "[bill]" to distinguish bills from normal expenses
        description: { startsWith: '[bill]' },
        ...(from || to ? { incurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { incurredAt: 'desc' },
      take: 500,
    });

    // Parse the metadata encoded in description
    const parsed = bills.map((b) => {
      const raw = b.description ?? '';
      const withoutFlag = raw.replace(/^\[bill\]/, '').trim();
      let meta: Record<string, string> = {};
      try { meta = JSON.parse(withoutFlag); } catch { /* plain text */ }
      return {
        id: b.id,
        vendor: b.vendor ?? meta.vendor ?? '—',
        amount: Number(b.amount),
        category: b.category,
        dueDate: meta.dueDate ?? null,
        status: meta.status ?? 'draft',
        paidAt: meta.paidAt ?? null,
        notes: meta.notes ?? null,
        incurredAt: b.incurredAt,
        property: b.property,
        propertyId: b.propertyId,
      };
    });

    // Filter by status after parsing
    const filtered = status ? parsed.filter((b) => b.status === status) : parsed;

    // Summary buckets
    const totals = filtered.reduce(
      (acc, b) => {
        acc.total += b.amount;
        if (b.status === 'draft') acc.draft += b.amount;
        else if (b.status === 'approved') acc.approved += b.amount;
        else if (b.status === 'paid') acc.paid += b.amount;
        else if (b.status === 'overdue') acc.overdue += b.amount;
        return acc;
      },
      { total: 0, draft: 0, approved: 0, paid: 0, overdue: 0 }
    );

    return NextResponse.json({ success: true, data: { bills: filtered, totals } });
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
    const { landlordId, vendor, amount, category, description, dueDate, propertyId, notes } = body;

    if (!landlordId || !vendor || !amount || !category)
      return NextResponse.json({ success: false, message: 'landlordId, vendor, amount, and category are required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const meta = JSON.stringify({ vendor, dueDate: dueDate ?? null, status: 'draft', paidAt: null, notes: notes ?? null });

    const bill = await prisma.expense.create({
      data: {
        landlordId,
        vendor,
        amount,
        category,
        description: `[bill]${meta}`,
        incurredAt: new Date(),
        propertyId: propertyId ?? null,
      },
    });

    return NextResponse.json({ success: true, data: bill }, { status: 201 });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
