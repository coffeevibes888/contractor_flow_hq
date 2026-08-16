/**
 * POST /api/contractor/jobs/[id]/generate-invoice
 *
 * Builds a draft ContractorInvoice from a job by rolling up:
 *   - Billable, unbilled expenses → "material/other" line items
 *   - Time entries with billable hours → "labor" line items
 *   - Approved change orders → "other" line items
 *
 * Returns the created invoice. Billable expenses are marked `billed`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth } from '@/lib/contractor-auth';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'labor' | 'material' | 'other';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { id } = await params;
    const db = prisma as any;

    const job = await db.contractorJob.findFirst({
      where: { id, contractorId: contractorAuth.contractorId },
      include: {
        expenses: true,
        timeEntries: true,
        changeOrders: true,
      },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.customerId) {
      return NextResponse.json(
        { error: 'This job has no customer attached. Add a customer before invoicing.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const taxRate: number = body.taxRate != null ? Number(body.taxRate) : 0;
    const dueInDays: number = body.dueInDays != null ? Number(body.dueInDays) : 30;
    const includeLabor: boolean = body.includeLabor !== false;
    const includeExpenses: boolean = body.includeExpenses !== false;
    const includeChangeOrders: boolean = body.includeChangeOrders !== false;

    const lineItems: LineItem[] = [];

    // 1. Labor — group billable time entries
    if (includeLabor) {
      const billable = job.timeEntries.filter(
        (t: any) => t.billableHours && Number(t.billableHours) > 0
      );
      const totalHours = billable.reduce((s: number, t: any) => s + Number(t.billableHours), 0);
      const totalLabor = billable.reduce(
        (s: number, t: any) => s + Number(t.totalAmount ?? Number(t.billableHours) * Number(t.hourlyRate ?? 0)),
        0
      );
      if (totalHours > 0) {
        const blendedRate = totalLabor > 0 ? totalLabor / totalHours : 0;
        lineItems.push({
          description: 'Labor',
          quantity: Number(totalHours.toFixed(2)),
          unitPrice: Number(blendedRate.toFixed(2)),
          type: 'labor',
        });
      }
    }

    // 2. Expenses — billable + not yet billed
    const billableExpenses = includeExpenses
      ? job.expenses.filter((e: any) => e.billable && !e.billed)
      : [];
    if (includeExpenses) {
      for (const exp of billableExpenses) {
        lineItems.push({
          description: `${exp.category}: ${exp.description}`,
          quantity: 1,
          unitPrice: Number(exp.amount),
          type: exp.category === 'Materials' ? 'material' : 'other',
        });
      }
    }

    // 3. Approved change orders
    if (includeChangeOrders) {
      const approvedCOs = job.changeOrders.filter((c: any) => c.status === 'approved');
      for (const co of approvedCOs) {
        lineItems.push({
          description: `Change Order: ${co.title}`,
          quantity: 1,
          unitPrice: Number(co.additionalCost),
          type: 'other',
        });
      }
    }

    // Fall back to the job's estimated cost if nothing else is billable
    if (lineItems.length === 0) {
      const fallback = Number(job.actualCost ?? job.estimatedCost ?? 0);
      if (fallback <= 0) {
        return NextResponse.json(
          { error: 'Nothing to invoice. Add billable hours, expenses, or a job value first.' },
          { status: 400 }
        );
      }
      lineItems.push({
        description: job.title || 'Services rendered',
        quantity: 1,
        unitPrice: fallback,
        type: 'other',
      });
    }

    const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const taxAmount = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
    const total = subtotal + taxAmount;

    // Generate invoice number (matches /api/contractor/invoices convention)
    const lastInvoice = await db.contractorInvoice.findFirst({
      where: { contractorId: contractorAuth.contractorId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    let invoiceNumber = 'INV-0001';
    if (lastInvoice?.invoiceNumber) {
      const parsed = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
      if (!Number.isNaN(parsed)) {
        invoiceNumber = `INV-${String(parsed + 1).padStart(4, '0')}`;
      }
    }

    const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000);

    const invoice = await db.contractorInvoice.create({
      data: {
        contractorId: contractorAuth.contractorId,
        invoiceNumber,
        customerId: job.customerId,
        lineItems,
        subtotal,
        taxRate: taxRate || null,
        taxAmount: taxAmount || null,
        total,
        amountDue: total,
        dueDate,
        jobId: id,
        notes: `Invoice for ${job.title || `Job #${job.jobNumber}`}`,
        status: 'draft',
      },
    });

    // Mark the billable expenses as billed so they don't get re-invoiced
    if (billableExpenses.length > 0) {
      await db.contractorExpense.updateMany({
        where: { id: { in: billableExpenses.map((e: any) => e.id) } },
        data: { billed: true },
      });
    }

    // Move the job to "invoiced" if it isn't already paid/invoiced
    if (!['invoiced', 'paid'].includes(job.status)) {
      await db.contractorJob.update({
        where: { id },
        data: { status: 'invoiced' },
      });
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('[POST generate-invoice]', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
