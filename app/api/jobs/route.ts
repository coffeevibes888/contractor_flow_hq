import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/jobs - Fetch active job postings for the public job board
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const location = searchParams.get('location');
    const search = searchParams.get('q');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');

    const where: any = { status: 'active' };

    if (category && category !== 'all') {
      where.category = category;
    }
    if (type && type !== 'all') {
      where.type = type;
    }
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'salary_high') orderBy = { salaryMax: 'desc' };
    if (sort === 'salary_low') orderBy = { salaryMin: 'asc' };

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { applicants: true } },
        },
      }),
      prisma.jobPosting.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/jobs - Create a new job posting
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title, description, type, category, location, isRemote,
      salaryMin, salaryMax, salaryType, requirements, benefits,
      companyName, companyLogo, companyAbout, experienceLevel, status,
    } = body;

    if (!title || !description || !location) {
      return NextResponse.json({ error: 'Title, description, and location are required' }, { status: 400 });
    }

    // Check if user is a landlord/PM and link accordingly
    let landlordId: string | null = null;
    const landlord = await prisma.landlord.findFirst({
      where: { ownerUserId: session.user.id },
      select: { id: true, companyName: true, logoUrl: true },
    });
    if (landlord) {
      landlordId = landlord.id;
    }

    const job = await prisma.jobPosting.create({
      data: {
        userId: session.user.id,
        landlordId,
        title,
        description,
        type: type || 'full-time',
        category: category || 'general',
        location,
        isRemote: isRemote || false,
        salaryMin: salaryMin ? parseFloat(salaryMin) : null,
        salaryMax: salaryMax ? parseFloat(salaryMax) : null,
        salaryType: salaryType || 'yearly',
        requirements,
        benefits,
        companyName: companyName || landlord?.companyName || session.user.name,
        companyLogo: companyLogo || landlord?.logoUrl || null,
        companyAbout,
        experienceLevel: experienceLevel || 'entry',
        status: status || 'active',
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Failed to create job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
