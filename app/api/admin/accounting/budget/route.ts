/**
 * Budget vs Actual API
 * Uses a simple JSON store in a dedicated table or property-level metadata.
 * We store budgets as Expense records with category = "[budget]" and a JSON description.
 *
 * GET  ?landlordId=&year=&month=
 * POST { landlordId, year, month, accountCode, budgetAmount }  — upsert
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

    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
    const monthParam = searchParams.get('month');
    const month = monthParam ? parseInt(monthParam, 10) : null;

    const from = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const to = month ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

    // Get stored budget lines
    const budgetRecords = await prisma.expense.findMany({
      where: {
        landlordId,
        category: '[budget]',
        incurredAt: { gte: from, lte: to },
      },
    });

    const budgetMap: Record<string, number> = {};
    for (const rec of budgetRecords) {
      try {
        const meta = JSON.parse(rec.description ?? '{}');
        budgetMap[meta.accountCode] = Number(rec.amount);
      } catch { /* skip */ }
    }

    // Get actual GL activity for the same period
    const lines = await prisma.journalLine.findMany({
      where: {
        entry: {
          landlordId,
          effectiveDate: { gte: from, lte: to },
        },
      },
      include: {
        account: { select: { code: true, name: true, type: true, subType: true } },
      },
    });

    // Aggregate actuals by account
    const actuals: Record<string, { code: string; name: string; type: string; actual: number }> = {};
    for (const line of lines) {
      const code = line.account.code;
      if (!actuals[code]) {
        actuals[code] = { code, name: line.account.name, type: line.account.type, actual: 0 };
      }
      // Income: net credit; Expense: net debit
      if (line.account.type === 'income') {
        actuals[code].actual += Number(line.credit) - Number(line.debit);
      } else if (line.account.type === 'expense') {
        actuals[code].actual += Number(line.debit) - Number(line.credit);
      }
    }

    // Merge budget + actual
    const allCodes = new Set([...Object.keys(budgetMap), ...Object.keys(actuals)]);
    const rows = Array.from(allCodes)
      .map((code) => {
        const actual = actuals[code];
        const budget = budgetMap[code] ?? 0;
        const actualAmt = actual?.actual ?? 0;
        const variance = actualAmt - budget;
        const variancePct = budget > 0 ? (variance / budget) * 100 : null;
        return {
          code,
          name: actual?.name ?? code,
          type: actual?.type ?? 'expense',
          budget,
          actual: actualAmt,
          variance,
          variancePct,
          overBudget: budget > 0 && actualAmt > budget,
        };
      })
      .filter((r) => r.budget > 0 || Math.abs(r.actual) > 0)
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalBudget = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.budget, 0);
    const totalActual = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.actual, 0);
    const incomeBudget = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.budget, 0);
    const incomeActual = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.actual, 0);

    return NextResponse.json({
      success: true,
      data: { year, month, rows, totalBudget, totalActual, incomeBudget, incomeActual },
    });
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
    const { landlordId, year, month, accountCode, budgetAmount } = body;

    if (!landlordId || !year || !month || !accountCode || budgetAmount === undefined)
      return NextResponse.json({ success: false, message: 'landlordId, year, month, accountCode, and budgetAmount are required' }, { status: 400 });

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord)
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });

    await assertAccountingManagement(landlordId);

    const periodStart = new Date(year, month - 1, 1);
    const meta = JSON.stringify({ accountCode, year, month });

    // Upsert: find existing budget record for this account/period
    const existing = await prisma.expense.findFirst({
      where: {
        landlordId,
        category: '[budget]',
        description: { contains: `"accountCode":"${accountCode}"` },
        incurredAt: { gte: periodStart, lte: new Date(year, month, 0) },
      },
    });

    let record;
    if (existing) {
      record = await prisma.expense.update({
        where: { id: existing.id },
        data: { amount: budgetAmount },
      });
    } else {
      record = await prisma.expense.create({
        data: {
          landlordId,
          category: '[budget]',
          description: meta,
          amount: budgetAmount,
          incurredAt: periodStart,
          isRecurring: false,
        },
      });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
