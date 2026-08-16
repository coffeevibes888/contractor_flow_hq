import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const homeowner = await (prisma as any).homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      return NextResponse.json({ error: 'Homeowner profile not found' }, { status: 404 });
    }

    const jobs = await (prisma as any).homeownerWorkOrder.findMany({
      where: { homeownerId: homeowner.id },
      include: {
        bids: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get or create homeowner profile
    let homeowner = await (prisma as any).homeowner.findUnique({
      where: { userId: session.user.id },
    });

    if (!homeowner) {
      homeowner = await (prisma as any).homeowner.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    const body = await request.json();
    const { title, description, category, priority, budgetMin, budgetMax } = body;

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const job = await (prisma as any).homeownerWorkOrder.create({
      data: {
        homeownerId: homeowner.id,
        title,
        description,
        category,
        priority: priority || 'medium',
        budgetMin: budgetMin || null,
        budgetMax: budgetMax || null,
        status: 'open',
        isOpenBid: true,
      },
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
