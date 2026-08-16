import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementCustomerCount } from '@/lib/services/contractor-usage-tracker';
import { runBackgroundOps } from '@/lib/middleware/contractor-background-ops';
import { 
  SubscriptionLimitError, 
  formatSubscriptionError, 
  logSubscriptionError 
} from '@/lib/errors/subscription-errors';

// GET - List all customers
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Run background operations
    await runBackgroundOps(contractorProfile.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const customers = await prisma.contractorCustomer.findMany({
      where: {
        contractorId: contractorProfile.id,
        ...(status && { status }),
      },
      include: {
        _count: {
          select: {
            jobs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST - Create new customer
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Run background operations (ensures monthly reset happens before checking limits)
    await runBackgroundOps(contractorProfile.id);

    // Check subscription limit for customers
    const limitCheck = await checkLimit(contractorProfile.id, 'customers');
    if (!limitCheck.allowed) {
      const error = new SubscriptionLimitError(
        'customers',
        limitCheck.current,
        limitCheck.limit,
        contractorProfile.subscriptionTier || 'starter'
      );
      
      logSubscriptionError(error, {
        contractorId: contractorProfile.id,
        feature: 'customers',
        action: 'create_customer',
      });
      
      const formatted = formatSubscriptionError(error);
      return NextResponse.json(formatted.body, { status: formatted.status });
    }

    const body = await request.json();

    // Check for duplicate email
    const existing = await prisma.contractorCustomer.findFirst({
      where: {
        contractorId: contractorProfile.id,
        email: body.email,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Customer with this email already exists' }, { status: 400 });
    }

    const customer = await prisma.contractorCustomer.create({
      data: {
        contractorId: contractorProfile.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        status: body.status || 'lead',
        source: body.source,
        tags: body.tags || [],
        notes: body.notes || [],
      },
    });

    // Increment customer count after successful creation
    await incrementCustomerCount(contractorProfile.id);

    await eventBus.emit('contractor.customer.created', {
      customerId: customer.id,
      contractorId: contractorProfile.id,
      customerName: customer.name,
      status: customer.status,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    // Handle subscription errors
    if (error instanceof SubscriptionLimitError) {
      const formatted = formatSubscriptionError(error);
      return NextResponse.json(formatted.body, { status: formatted.status });
    }
    
    console.error('Error creating customer:', error);
    logSubscriptionError(error, {
      action: 'create_customer',
      error: 'unexpected_error',
    });
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
