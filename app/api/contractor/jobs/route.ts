import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-system';
import { checkLimit } from '@/lib/services/contractor-feature-gate';
import { incrementJobCount } from '@/lib/services/contractor-usage-tracker';
import { runBackgroundOps } from '@/lib/middleware/contractor-background-ops';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';
import { 
  SubscriptionLimitError, 
  formatSubscriptionError, 
  logSubscriptionError 
} from '@/lib/errors/subscription-errors';
import {
  errorResponse,
  normalizeRequestBody,
  parseDate,
  serverError,
} from '@/lib/contractor-route-helpers';

// GET - List all jobs for contractor
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'jobs.view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Run background operations (daily check, monthly reset)
    await runBackgroundOps(contractorAuth.contractorId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const jobs = await prisma.contractorJob.findMany({
      where: {
        contractorId: contractorAuth.contractorId,
        ...(status && { status }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            timeEntries: true,
            expenses: true,
            changeOrders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return serverError('Failed to fetch jobs', error);
  }
}

// POST - Create new job
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'jobs.create')) {
      return NextResponse.json({ error: 'Insufficient permissions — jobs.create required' }, { status: 403 });
    }

    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { id: contractorAuth.contractorId },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    // Run background operations (ensures monthly reset happens before checking limits)
    await runBackgroundOps(contractorProfile.id);

    // Check subscription limit for active jobs
    const limitCheck = await checkLimit(contractorProfile.id, 'activeJobs');
    if (!limitCheck.allowed) {
      const error = new SubscriptionLimitError(
        'active jobs',
        limitCheck.current,
        limitCheck.limit,
        contractorProfile.subscriptionTier || 'starter'
      );
      
      logSubscriptionError(error, {
        contractorId: contractorProfile.id,
        feature: 'activeJobs',
        action: 'create_job',
      });
      
      const formatted = formatSubscriptionError(error);
      return NextResponse.json(formatted.body, { status: formatted.status });
    }

    const rawBody = await request.json();
    // Empty `<select>` and `<input>` values arrive as `""` from the browser
    // and Prisma rejects empty strings on UUID/Date columns. Normalize once
    // here so every downstream field is either a real value or null.
    const body = normalizeRequestBody(rawBody);

    // Generate job number
    const year = new Date().getFullYear();
    const lastJob = await prisma.contractorJob.findFirst({
      where: {
        contractorId: contractorProfile.id,
        jobNumber: { startsWith: `JOB-${year}-` },
      },
      orderBy: { jobNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastJob) {
      const lastNumber = parseInt(lastJob.jobNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    const jobNumber = `JOB-${year}-${String(nextNumber).padStart(4, '0')}`;

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return errorResponse('Job title is required', 400, { code: 'VALIDATION' });
    }

    // Create job
    const job = await prisma.contractorJob.create({
      data: {
        contractorId: contractorProfile.id,
        jobNumber,
        title: body.title,
        description: body.description ?? null,
        jobType: body.jobType ?? null,
        status: body.status || 'quoted',
        customerId: body.customerId ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        zipCode: body.zipCode ?? null,
        estimatedCost: body.estimatedCost ?? null,
        laborCost: body.laborCost ?? null,
        materialCost: body.materialCost ?? null,
        estimatedStartDate: parseDate(body.estimatedStartDate),
        estimatedEndDate: parseDate(body.estimatedEndDate),
        estimatedHours: body.estimatedHours ?? null,
        assignedEmployeeIds: body.assignedEmployeeIds || [],
        notes: body.notes ?? null,
        tags: body.tags || [],
        priority: body.priority || 'normal',
      },
      include: {
        customer: true,
      },
    });

    // Increment job count after successful creation
    await incrementJobCount(contractorProfile.id);

    // Emit event for job creation
    await eventBus.emit('contractor.job.created', {
      jobId: job.id,
      contractorId: contractorProfile.id,
      customerId: job.customerId,
      jobNumber: job.jobNumber,
      title: job.title,
      status: job.status,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    // Handle subscription errors
    if (error instanceof SubscriptionLimitError) {
      const formatted = formatSubscriptionError(error);
      return NextResponse.json(formatted.body, { status: formatted.status });
    }

    logSubscriptionError(error, {
      action: 'create_job',
      error: 'unexpected_error',
    });

    return serverError('Failed to create job', error);
  }
}
