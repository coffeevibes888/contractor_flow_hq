import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/contractor/jobs/scheduled - Get jobs scheduled for a date range
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates required' }, { status: 400 });
    }

    const jobs = await prisma.$queryRaw`
      SELECT 
        j.id, j.title, j."jobNumber", j.status, j."estimatedStartDate" as "startDate",
        j."estimatedHours", j.address, j.city, j.state,
        c.name as "customerName",
        j."assignedEmployeeIds"
      FROM "ContractorJob" j
      LEFT JOIN "ContractorCustomer" c ON j."customerId" = c.id
      WHERE j."contractorId" = ${contractorProfile.id}
      AND j."estimatedStartDate" >= ${new Date(start)}
      AND j."estimatedStartDate" <= ${new Date(end)}
      AND j.status IN ('scheduled', 'in_progress', 'approved')
      ORDER BY j."estimatedStartDate" ASC
    `;

    return NextResponse.json({ success: true, jobs: jobs || [] });
  } catch (error) {
    console.error('Error fetching scheduled jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled jobs' }, { status: 500 });
  }
}
