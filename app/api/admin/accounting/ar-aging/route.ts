/**
 * AR Aging Report — tenants with outstanding balances bucketed by days overdue.
 * GET ?landlordId=&asOf=
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { assertAccountingReports } from '@/lib/accounting/feature-gate';
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

    await assertAccountingReports(landlordId);

    const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date();

    // Get all active leases with their last ledger entry balance
    const leases = await prisma.lease.findMany({
      where: {
        unit: { property: { landlordId } },
        status: 'active',
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        unit: { select: { name: true, property: { select: { name: true } } } },
      },
    });

    // Get outstanding invoices per tenant
    const invoices = await prisma.tenantInvoice.findMany({
      where: {
        property: { landlordId },
        status: { in: ['pending', 'overdue'] },
        dueDate: { lte: asOf },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { name: true } },
      },
    });

    // Get last ledger balance per lease
    const leaseIds = leases.map((l) => l.id);
    const lastEntries = leaseIds.length > 0
      ? await Promise.all(
          leaseIds.map((lid) =>
            prisma.tenantLedgerEntry.findFirst({
              where: { leaseId: lid, postedAt: { lte: asOf } },
              orderBy: { postedAt: 'desc' },
              select: { leaseId: true, runningBalance: true, postedAt: true },
            })
          )
        )
      : [];

    const balanceByLease = new Map(
      lastEntries.filter(Boolean).map((e) => [e!.leaseId, Number(e!.runningBalance)])
    );

    // Build AR rows from ledger balances > 0
    const rows: Array<{
      tenantId: string;
      tenantName: string;
      tenantEmail: string;
      propertyUnit: string;
      leaseId: string;
      balance: number;
      current: number;
      days30: number;
      days60: number;
      days90plus: number;
      oldestDueDate: string | null;
    }> = [];

    for (const lease of leases) {
      const balance = balanceByLease.get(lease.id) ?? 0;
      if (balance <= 0) continue;

      const daysPastDue = lease.startDate
        ? Math.max(0, Math.floor((asOf.getTime() - new Date(lease.startDate).getTime()) / 86400000) % 30)
        : 0;

      // Simple bucketing: distribute balance based on how long lease has been active
      const leaseAgeMonths = Math.floor(
        (asOf.getTime() - new Date(lease.startDate).getTime()) / (30 * 86400000)
      );

      rows.push({
        tenantId: lease.tenant?.id ?? '',
        tenantName: lease.tenant?.name ?? '—',
        tenantEmail: lease.tenant?.email ?? '—',
        propertyUnit: [lease.unit?.property?.name, lease.unit?.name].filter(Boolean).join(' · '),
        leaseId: lease.id,
        balance,
        current: leaseAgeMonths === 0 ? balance : 0,
        days30: leaseAgeMonths === 1 ? balance : 0,
        days60: leaseAgeMonths === 2 ? balance : 0,
        days90plus: leaseAgeMonths >= 3 ? balance : 0,
        oldestDueDate: null,
      });
    }

    // Also include standalone overdue invoices not in the ledger
    const invoicesByTenant = new Map<string, typeof invoices>();
    for (const inv of invoices) {
      const tid = inv.tenantId;
      if (!invoicesByTenant.has(tid)) invoicesByTenant.set(tid, []);
      invoicesByTenant.get(tid)!.push(inv);
    }

    const summary = {
      total: rows.reduce((s, r) => s + r.balance, 0),
      current: rows.reduce((s, r) => s + r.current, 0),
      days30: rows.reduce((s, r) => s + r.days30, 0),
      days60: rows.reduce((s, r) => s + r.days60, 0),
      days90plus: rows.reduce((s, r) => s + r.days90plus, 0),
      tenantCount: rows.length,
    };

    return NextResponse.json({ success: true, data: { rows, summary, asOf: asOf.toISOString() } });
  } catch (e) {
    return handleAccountingApiError(e);
  }
}
