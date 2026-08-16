import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// Get all job postings for landlord
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const jobs = await prisma.jobPosting.findMany({
      where: { landlordId: landlord.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applicants: true } },
      },
    });

    return NextResponse.json({
      success: true,
      jobs: jobs.map(j => ({
        id: j.id,
        title: j.title,
        description: j.description,
        type: j.type,
        location: j.location,
        salary: j.salary,
        requirements: j.requirements,
        benefits: j.benefits,
        status: j.status,
        createdAt: j.createdAt,
        applicantCount: j._count.applicants,
      })),
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json({ success: false, message: 'Failed to get jobs' }, { status: 500 });
  }
}

// Create a new job posting
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
    });

    if (!landlord) {
      return NextResponse.json({ success: false, message: 'Landlord not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title, description, type, location, salary, requirements, benefits,
      category, isRemote, salaryMin, salaryMax, salaryType,
      companyName, companyLogo, companyAbout, experienceLevel,
    } = body;

    if (!title || !description || !location) {
      return NextResponse.json({ success: false, message: 'Title, description, and location are required' }, { status: 400 });
    }

    const job = await prisma.jobPosting.create({
      data: {
        landlordId: landlord.id,
        userId: session.user.id,
        title,
        description,
        type: type || 'full-time',
        category: category || 'general',
        location,
        isRemote: isRemote || false,
        salary,
        salaryMin: salaryMin ? parseFloat(salaryMin) : null,
        salaryMax: salaryMax ? parseFloat(salaryMax) : null,
        salaryType: salaryType || 'yearly',
        requirements,
        benefits,
        companyName: companyName || landlord.companyName || landlord.name,
        companyLogo: companyLogo || landlord.logoUrl || null,
        companyAbout,
        experienceLevel: experienceLevel || 'entry',
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        type: job.type,
        location: job.location,
        salary: job.salary,
        status: job.status,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error('Create job error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create job' }, { status: 500 });
  }
}
