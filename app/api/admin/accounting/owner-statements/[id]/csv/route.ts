import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { computeOwnerStatementSummary } from '@/lib/accounting/owner-statements';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

function fmtCurrency(n: number): string {
  return n.toFixed(2);
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { id: statementId } = await params;
    const statement = await prisma.ownerStatement.findUnique({
      where: { id: statementId },
      include: { owner: { select: { name: true, email: true } } },
    });
    if (!statement) {
      return NextResponse.json({ message: 'Statement not found' }, { status: 404 });
    }
    const landlord = await prisma.landlord.findFirst({
      where: { id: statement.landlordId, ownerUserId: session.user.id },
      select: { id: true },
    });
    if (!landlord) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    await assertAccountingLedger(statement.landlordId);

    const summary = await computeOwnerStatementSummary(
      statement.landlordId,
      statement.ownerId,
      statement.periodStart,
      statement.periodEnd,
    );

    const lines: string[] = [];
    lines.push('OWNER DISTRIBUTION STATEMENT');
    lines.push(`Owner,${csvEscape(statement.owner.name)}`);
    if (statement.owner.email) lines.push(`Email,${csvEscape(statement.owner.email)}`);
    lines.push(`Period Start,${statement.periodStart.toISOString().slice(0, 10)}`);
    lines.push(`Period End,${statement.periodEnd.toISOString().slice(0, 10)}`);
    lines.push(`Status,${statement.status}`);
    lines.push(`Generated,${statement.generatedAt.toISOString()}`);
    lines.push('');

    lines.push('INCOME');
    lines.push('Account Code,Account Name,Amount');
    for (const l of summary.income) lines.push(`${csvEscape(l.accountCode)},${csvEscape(l.accountName)},${fmtCurrency(l.amount)}`);
    lines.push(`Total Income,,${fmtCurrency(Number(statement.totalIncome))}`);
    lines.push('');

    lines.push('EXPENSES');
    lines.push('Account Code,Account Name,Amount');
    for (const l of summary.expense) lines.push(`${csvEscape(l.accountCode)},${csvEscape(l.accountName)},${fmtCurrency(Math.abs(l.amount))}`);
    lines.push(`Total Expenses,,${fmtCurrency(Number(statement.totalExpense))}`);
    lines.push('');

    lines.push('SUMMARY');
    lines.push(`Net Operating Income,${fmtCurrency(Number(statement.netIncome))}`);
    lines.push(`Management Fee %,${Number(statement.managementFeePct).toFixed(2)}%`);
    lines.push(`Management Fee,${fmtCurrency(Number(statement.managementFee))}`);
    lines.push(`Distribution,${fmtCurrency(Number(statement.distribution))}`);

    if (statement.notes) {
      lines.push('');
      lines.push('NOTES');
      lines.push(csvEscape(statement.notes));
    }

    const csv = lines.join('\n');
    const safeOwner = statement.owner.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const periodTag = `${statement.periodStart.toISOString().slice(0, 10)}_${statement.periodEnd.toISOString().slice(0, 10)}`;
    const filename = `owner-statement-${safeOwner}-${periodTag}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
