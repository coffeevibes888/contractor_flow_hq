import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { computeOwnerStatementSummary } from '@/lib/accounting/owner-statements';
import { generateOwnerStatementPdf, type OwnerStatementPdfData } from '@/lib/services/owner-statement-pdf.service';
import { verifyOwnerStatementToken } from '@/lib/accounting/owner-statement-token';

/**
 * GET /api/public/owner-statements/:id/pdf?token=...
 *
 * Public (no-auth) PDF download gated by a short-lived signed token. The
 * token is generated server-side and embedded in the owner-statement email
 * by the admin/owner-statements POST handler.
 *
 * Returns 401 if the token is missing/malformed, 403 on bad signature or
 * expired token, 404 if the statement doesn't exist, 200 with the PDF on
 * success.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: statementId } = await params;
  const token = request.nextUrl.searchParams.get('token') ?? '';

  const verified = verifyOwnerStatementToken(token);
  if (!verified.ok) {
    return NextResponse.json(
      { error: 'invalid_token', reason: verified.reason },
      { status: verified.reason === 'expired' ? 403 : 401 },
    );
  }
  if (verified.statementId !== statementId) {
    return NextResponse.json({ error: 'token_statement_mismatch' }, { status: 401 });
  }

  const statement = await prisma.ownerStatement.findUnique({
    where: { id: statementId },
    include: { owner: { select: { name: true, email: true } } },
  });
  if (!statement) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Recompute line items from the GL so the public PDF matches what the
  // landlord sees. This is the same logic as the auth'd admin route.
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
      'Cache-Control': 'private, no-store',
    },
  });
}
