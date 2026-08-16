import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementInvoiceCount } from '@/lib/services/contractor-usage-tracker';
import { runBackgroundOps, runMonthlyResetOnly } from '@/lib/middleware/contractor-background-ops';
import { 
  SubscriptionLimitError, 
  formatSubscriptionError, 
  logSubscriptionError 
} from '@/lib/errors/subscription-errors';

// GET - List invoices
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Run background operations
    await runBackgroundOps(contractorProfile.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const where: any = {
      contractorId: contractorProfile.id,
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const invoices = await prisma.contractorInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST - Create invoice
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, subscriptionTier: true },
    });

    if (!contractorProfile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      );
    }

    // Run monthly reset before creating invoice (ensures counters are accurate)
    await runMonthlyResetOnly(contractorProfile.id);

    // Check subscription limit for invoices per month
    const limitCheck = await checkLimit(contractorProfile.id, 'invoicesPerMonth');
    if (!limitCheck.allowed) {
      const error = new SubscriptionLimitError(
        'invoices per month',
        limitCheck.current,
        limitCheck.limit,
        contractorProfile.subscriptionTier || 'starter'
      );
      
      logSubscriptionError(error, {
        contractorId: contractorProfile.id,
        feature: 'invoicesPerMonth',
        action: 'create_invoice',
      });
      
      const formatted = formatSubscriptionError(error);
      return NextResponse.json(formatted.body, { status: formatted.status });
    }

    const body = await request.json();
    const {
      customerId,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      dueDate,
      notes,
      terms,
      jobId,
    } = body;

    if (!customerId || !lineItems || !total || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate invoice number
    const lastInvoice = await prisma.contractorInvoice.findFirst({
      where: { contractorId: contractorProfile.id },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    let invoiceNumber = 'INV-0001';
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    const invoice = await prisma.contractorInvoice.create({
      data: {
        contractorId: contractorProfile.id,
        invoiceNumber,
        customerId,
        lineItems: lineItems || [],
        subtotal: subtotal || 0,
        taxRate: taxRate || null,
        taxAmount: taxAmount || null,
        total,
        amountDue: total,
        dueDate: new Date(dueDate),
        notes: notes || null,
        terms: terms || null,
        jobId: jobId || null,
        status: 'draft',
      },
    });

    // Increment invoice count after successful creation
    await incrementInvoiceCount(contractorProfile.id);

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    // Handle subscription errors
    if (error instanceof SubscriptionLimitError) {
      const formatted = formatSubscriptionError(error);
      return NextResponse.json(formatted.body, { status: formatted.status });
    }
    
    console.error('Error creating invoice:', error);
    logSubscriptionError(error, {
      action: 'create_invoice',
      error: 'unexpected_error',
    });
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
