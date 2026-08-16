/**
 * Expenses — list + create for the property expense tracker.
 *
 * GET  /api/mobile/pm/expenses?propertyId=&category=&from=&to=
 * POST /api/mobile/pm/expenses
 *      Body: { propertyId?, unitId?, amount, category, description?, vendor?,
 *              incurredAt, receiptUrl?, receiptOcrData? }
 *
 * Used by the receipt scanner flow (after OCR runs the user confirms the
 * extracted fields and submits → an Expense is created with the receipt URL).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

const ALLOWED_CATEGORIES = [
  'maintenance', 'utilities', 'insurance', 'tax', 'mortgage', 'cleaning',
  'supplies', 'marketing', 'legal', 'travel', 'other',
];

async function landlordFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyMobileToken(token);
  if (!payload) return null;
  if (!PM_ROLES.has(payload.role)) return null;
  return prisma.landlord.findFirst({
    where: { ownerUserId: payload.userId },
    select: { id: true },
  });
}

export async function GET(req: NextRequest) {
  try {
    const landlord = await landlordFromToken(req);
    if (!landlord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const where: any = { landlordId: landlord.id };
    if (searchParams.get('propertyId')) where.propertyId = searchParams.get('propertyId');
    if (searchParams.get('unitId')) where.unitId = searchParams.get('unitId');
    if (searchParams.get('category')) where.category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      where.incurredAt = {};
      if (from) where.incurredAt.gte = new Date(from);
      if (to) where.incurredAt.lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { incurredAt: 'desc' },
      take: 100,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
    });

    const totalsByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: { landlordId: landlord.id },
      _sum: { amount: true },
    });

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        category: e.category,
        description: e.description,
        vendor: e.vendor,
        incurredAt: e.incurredAt,
        receiptUrl: e.receiptUrl,
        propertyName: e.property?.name ?? null,
        unitName: e.unit?.name ?? null,
        propertyId: e.propertyId,
        unitId: e.unitId,
      })),
      totals: Object.fromEntries(
        totalsByCategory.map((c) => [c.category, Number(c._sum.amount ?? 0)]),
      ),
    });
  } catch (e) {
    console.error('list expenses', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const landlord = await landlordFromToken(req);
    if (!landlord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      propertyId, unitId, amount, category, description, vendor,
      incurredAt, receiptUrl, receiptOcrData,
    } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({
        error: `category must be one of ${ALLOWED_CATEGORIES.join(', ')}`,
      }, { status: 400 });
    }

    // If a property was passed, verify ownership
    if (propertyId) {
      const owns = await prisma.property.findFirst({
        where: { id: propertyId, landlordId: landlord.id },
        select: { id: true },
      });
      if (!owns) return NextResponse.json({ error: 'Property not in your portfolio' }, { status: 403 });
    }

    const expense = await prisma.expense.create({
      data: {
        landlordId: landlord.id,
        propertyId: propertyId ?? null,
        unitId: unitId ?? null,
        amount,
        category,
        description: description ?? null,
        vendor: vendor ?? null,
        incurredAt: incurredAt ? new Date(incurredAt) : new Date(),
        receiptUrl: receiptUrl ?? null,
        receiptOcrData: receiptOcrData ?? undefined,
      },
    });

    // Best-effort GL post for Pro/Enterprise tiers. Source-keyed by
    // (expense, expense.id) so the post is idempotent on retry.
    try {
      const { postExpense } = await import('@/lib/accounting');
      await postExpense(
        landlord.id,
        expense.id,
        amount,
        category,
        expense.incurredAt,
        {
          propertyId: propertyId ?? undefined,
          unitId: unitId ?? undefined,
        },
      );
    } catch (glErr) {
      console.error('[accounting] expense GL post failed', expense.id, glErr);
    }

    return NextResponse.json({ expense });
  } catch (e) {
    console.error('create expense', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
