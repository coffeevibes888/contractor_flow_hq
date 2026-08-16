import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contractor profile
    const contractorProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!contractorProfile) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }

    const contractorId = contractorProfile.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent activity
    const [recentLeads, recentJobs, recentQuotes] = await Promise.all([
      // Recent leads
      prisma.contractorLeadMatch.findMany({
        where: { contractorId },
        include: {
          lead: {
            select: {
              id: true,
              projectType: true,
              projectTitle: true,
              customerName: true,
              propertyCity: true,
              propertyState: true,
              budgetMin: true,
              budgetMax: true,
              priority: true,
              stage: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),

      // Recent jobs
      prisma.contractorJob.findMany({
        where: { contractorId },
        include: {
          customer: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),

      // Recent quotes
      prisma.contractorQuote.findMany({
        where: { contractorId: contractorId },
        include: {
          lead: {
            select: {
              customerName: true,
              projectType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return NextResponse.json({
      leads: recentLeads,
      jobs: recentJobs,
      quotes: recentQuotes,
    });
  } catch (error) {
    console.error('Error fetching contractor dashboard activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
