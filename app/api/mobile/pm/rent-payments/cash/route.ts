/**
 * POST /api/mobile/pm/rent-payments/cash
 *
 * Mobile-token equivalent of /api/rent-payments/cash. Marks a rent payment
 * as paid in cash on a lease the authed PM owns.
 *
 *   - If there's a pending/overdue RentPayment, that row is updated to
 *     `paid` with `paymentMethod = 'cash'`.
 *   - Otherwise a new RentPayment row is created and immediately marked paid.
 *   - Landlord wallet's available balance is incremented by the amount.
 *
 * Body: { leaseId, amount, note? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { PM_ROLES } from '@/lib/mobile-roles';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyMobileToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!PM_ROLES.has(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: payload.userId },
      select: { id: true },
    });
    if (!landlord) return NextResponse.json({ error: 'No landlord' }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as {
      leaseId?: string;
      amount?: number;
      note?: string;
    };
    if (!body.leaseId) return NextResponse.json({ error: 'leaseId is required' }, { status: 400 });
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
    }

    // Verify the lease belongs to this landlord
    const lease = await prisma.lease.findFirst({
      where: {
        id: body.leaseId,
        unit: { property: { landlordId: landlord.id } },
      },
      select: {
        id: true,
        tenantId: true,
      },
    });
    if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

    // Match the website's "find oldest pending payment first" pattern.
    const pendingPayment = await prisma.rentPayment.findFirst({
      where: {
        leaseId: lease.id,
        status: { in: ['pending', 'overdue'] },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    let rentPaymentId: string;

    if (pendingPayment) {
      const updated = await prisma.rentPayment.update({
        where: { id: pendingPayment.id },
        data: {
          status: 'paid',
          paidAt: now,
          paymentMethod: 'cash',
          metadata: { note: body.note || 'Cash payment received' },
        },
      });
      rentPaymentId = updated.id;
    } else {
      const created = await prisma.rentPayment.create({
        data: {
          leaseId: lease.id,
          tenantId: lease.tenantId,
          amount: body.amount,
          dueDate: now,
          paidAt: now,
          status: 'paid',
          paymentMethod: 'cash',
          metadata: { note: body.note || 'Cash payment received' },
        },
      });
      rentPaymentId = created.id;
    }

    // Mirror the website: log a PaymentTransaction row so partial-payment
    // ledger queries see this cash drop.
    await prisma.paymentTransaction.create({
      data: {
        rentPaymentId,
        amount: body.amount,
        status: 'succeeded',
        method: 'cash',
      },
    });

    // Credit landlord wallet — same pattern as the website endpoint.
    await prisma.landlordWallet.upsert({
      where: { landlordId: landlord.id },
      create: {
        landlordId: landlord.id,
        availableBalance: body.amount,
        pendingBalance: 0,
      },
      update: { availableBalance: { increment: body.amount } },
    });

    return NextResponse.json({ success: true, rentPaymentId });
  } catch (e: any) {
    console.error('[mobile/pm/rent-payments/cash]', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
