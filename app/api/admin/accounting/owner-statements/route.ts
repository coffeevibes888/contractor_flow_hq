import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import {
  generateOwnerStatement,
  finalizeStatement,
  markStatementSent,
} from '@/lib/accounting/owner-statements';
import { assertAccountingLedger } from '@/lib/accounting/feature-gate';
import { handleAccountingApiError } from '@/lib/accounting/api-error';
import { issueOwnerStatementToken } from '@/lib/accounting/owner-statement-token';

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

    await assertAccountingLedger(landlordId);

    const [statements, owners] = await Promise.all([
      prisma.ownerStatement.findMany({
        where: { landlordId },
        orderBy: [{ periodEnd: 'desc' }, { ownerId: 'asc' }],
        include: {
          owner: { select: { id: true, name: true, email: true, payoutSplit: true } },
        },
      }),
      prisma.owner.findMany({
        where: { landlordId, isActive: true },
        select: { id: true, name: true, email: true, payoutSplit: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ success: true, data: { statements, owners } });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let body: {
      landlordId?: string;
      ownerId?: string;
      statementId?: string;
      periodStart?: string;
      periodEnd?: string;
      action?: 'generate' | 'finalize' | 'send';
      recipients?: string[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }

    const { landlordId, ownerId, statementId, periodStart, periodEnd, action = 'generate', recipients } = body;
    if (!landlordId) {
      return NextResponse.json({ success: false, message: 'landlordId is required' }, { status: 400 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { id: landlordId, ownerUserId: session.user.id },
    });
    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    await assertAccountingLedger(landlordId);

    if (action === 'generate') {
      if (!ownerId || !periodStart || !periodEnd) {
        return NextResponse.json({ success: false, message: 'ownerId, periodStart, periodEnd required' }, { status: 400 });
      }
      const result = await generateOwnerStatement(
        landlordId,
        ownerId,
        new Date(periodStart),
        new Date(periodEnd),
        session.user.id,
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'finalize' || action === 'send') {
      if (!statementId) {
        return NextResponse.json({ success: false, message: 'statementId required' }, { status: 400 });
      }
      const st = await prisma.ownerStatement.findFirst({
        where: { id: statementId, landlordId },
        include: { owner: { select: { id: true, name: true, email: true } } },
      });
      if (!st) return NextResponse.json({ success: false, message: 'Statement not found' }, { status: 404 });

      if (action === 'finalize') {
        const result = await finalizeStatement(statementId);
        return NextResponse.json({ success: true, data: result });
      }

      if (st.status === 'sent') {
        return NextResponse.json({
          success: false,
          message: 'Statement has already been sent. Create a corrected statement instead.',
        }, { status: 409 });
      }
      if (st.status === 'draft') {
        return NextResponse.json({
          success: false,
          message: 'Finalize the statement before sending.',
        }, { status: 400 });
      }

      const sendTo = (recipients && recipients.length > 0)
        ? recipients
        : (st.owner.email ? [st.owner.email] : []);

      if (sendTo.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No recipient email — add an email to the owner or pass `recipients[]`.',
        }, { status: 400 });
      }

      const token = issueOwnerStatementToken(statementId);
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
      const publicUrl = process.env.NEXT_PUBLIC_PUBLIC_APP_URL
        ?? (process.env.NODE_ENV === 'production'
          ? `https://${rootDomain}`
          : `http://${rootDomain}`);
      const statementUrl = `${publicUrl}/api/public/owner-statements/${statementId}/pdf?token=${token}`;

      const periodStartD = st.periodStart;
      const periodEndD = st.periodEnd;
      const fmtDate = (d: Date) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
      const yearFmt = (d: Date) =>
        new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(d);
      const periodLabel = periodStartD.getFullYear() === periodEndD.getFullYear()
        ? `${fmtDate(periodStartD)} – ${fmtDate(periodEndD)}, ${yearFmt(periodEndD)}`
        : `${fmtDate(periodStartD)}, ${yearFmt(periodStartD)} – ${fmtDate(periodEndD)}, ${yearFmt(periodEndD)}`;

      let emailMessageId: string | null = null;
      let emailError: string | null = null;
      try {
        const { sendBrandedEmail } = await import('@/lib/services/email-service');
        const result = await sendBrandedEmail({
          to: sendTo,
          subject: `Owner statement — ${periodLabel}`,
          template: 'owner-statement',
          landlordId,
          data: {
            ownerName: st.owner.name,
            periodStart: fmtDate(periodStartD),
            periodEnd: fmtDate(periodEndD),
            totalIncome: Number(st.totalIncome),
            totalExpense: Number(st.totalExpense),
            netIncome: Number(st.netIncome),
            managementFee: Number(st.managementFee),
            distribution: Number(st.distribution),
            statementUrl,
            notes: st.notes,
          },
        });
        emailMessageId = result?.messageId ?? null;
      } catch (e) {
        emailError = e instanceof Error ? e.message : 'unknown email error';
        console.error('[owner-statement] email send failed', statementId, emailError);
      }

      if (emailError) {
        return NextResponse.json({
          success: false,
          message: `Email delivery failed: ${emailError}`,
          code: 'EMAIL_FAILED',
        }, { status: 502 });
      }

      const result = await markStatementSent(statementId, sendTo);
      return NextResponse.json({
        success: true,
        data: result,
        meta: { messageId: emailMessageId, statementUrl, recipients: sendTo },
      });
    }

    return NextResponse.json({ success: false, message: `Unknown action ${action}` }, { status: 400 });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
