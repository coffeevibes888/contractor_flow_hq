import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { computeOwnerStatementSummary } from '@/lib/accounting/owner-statements';
import { generateOwnerStatementPdf, type OwnerStatementPdfData } from '@/lib/services/owner-statement-pdf.service';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';

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
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
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

    const propertyLink = await prisma.propertyOwner.findFirst({
      where: { ownerId: statement.ownerId },
      orderBy: { effectiveFrom: 'desc' },
      include: { property: { select: { name: true } } },
    });

    const data: OwnerStatementPdfData = {
      ownerName: statement.owner.name,
      ownerEmail: statement.owner.email,
      periodStart: statement.periodStart.toISOString(),
      periodEnd: statement.periodEnd.toISOString(),
      generatedAt: statement.generatedAt.toISOString(),
      propertyName: propertyLink?.property?.name ?? '',
      lineItems: [...summary.income, ...summary.expense].map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        amount: l.amount,
      })),
      totalIncome: Number(statement.totalIncome),
      totalExpense: Number(statement.totalExpense),
      netIncome: Number(statement.netIncome),
      managementFeePct: Number(statement.managementFeePct),
      managementFee: Number(statement.managementFee),
      distribution: Number(statement.distribution),
      status: statement.status as 'draft' | 'finalized' | 'sent',
      notes: statement.notes,
    };

    const pdfBuffer = await generateOwnerStatementPdf(data);

    const safeOwner = statement.owner.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const periodTag = `${statement.periodStart.toISOString().slice(0, 10)}_${statement.periodEnd.toISOString().slice(0, 10)}`;
    const filename = `owner-statement-${safeOwner}-${periodTag}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
