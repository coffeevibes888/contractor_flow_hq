import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { resolveContractorAuth, can } from '@/lib/contractor-auth';

const db = prisma as any;

// GET - List hiring posts for this contractor
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const posts = await db.contractorHiringPost.findMany({
      where: {
        contractorId: contractorAuth.contractorId,
        ...(status && { status }),
      },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('GET /api/contractor/hiring', error);
    return NextResponse.json({ error: 'Failed to fetch hiring posts' }, { status: 500 });
  }
}

// POST - Create a new hiring post
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractorAuth = await resolveContractorAuth(session.user.id);
    if (!contractorAuth) {
      return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 });
    }
    if (!can(contractorAuth, 'team.invite')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title, description, roleId, employeeType, payType,
      payRangeMin, payRangeMax, requiredSkills, requiredCerts,
      experienceYears, driversLicense, backgroundCheck,
      city, state, openings, requireResume, requireId, customQuestions,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const post = await db.contractorHiringPost.create({
      data: {
        contractorId: contractorAuth.contractorId,
        title,
        description,
        roleId: roleId || null,
        employeeType: employeeType || 'w2',
        payType: payType || 'hourly',
        payRangeMin: payRangeMin ? parseFloat(payRangeMin) : null,
        payRangeMax: payRangeMax ? parseFloat(payRangeMax) : null,
        requiredSkills: requiredSkills || [],
        requiredCerts: requiredCerts || [],
        experienceYears: experienceYears ? parseInt(experienceYears) : null,
        driversLicense: driversLicense || false,
        backgroundCheck: backgroundCheck || false,
        city: city || null,
        state: state || null,
        openings: openings ? parseInt(openings) : 1,
        requireResume: requireResume ?? false,
        requireId: requireId ?? true,
        customQuestions: customQuestions || null,
        status: 'active',
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contractor/hiring', error);
    return NextResponse.json({ error: 'Failed to create hiring post' }, { status: 500 });
  }
}
