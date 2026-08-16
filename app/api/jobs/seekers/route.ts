import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

// GET /api/jobs/seekers - Fetch public job seeker profiles
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const search = searchParams.get('q');

    const where: any = { isPublic: true, isAvailable: true };

    if (category && category !== 'all') {
      where.desiredCategories = { has: category };
    }
    if (location) {
      where.OR = [
        { city: { contains: location, mode: 'insensitive' } },
        { state: { contains: location, mode: 'insensitive' } },
      ];
    }
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { headline: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { skills: { hasSome: [search] } },
      ];
    }

    const seekers = await prisma.jobSeekerProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, seekers });
  } catch (error) {
    console.error('Failed to fetch seekers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/jobs/seekers - Create or update job seeker profile
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      headline, bio, profilePhoto, coverPhoto, firstName, lastName,
      email, phone, city, state, isAvailable, desiredJobTypes,
      desiredCategories, desiredSalaryMin, desiredSalaryMax, salaryType,
      skills, certifications, yearsExperience, education, resumeUrl,
      portfolioUrl, isPublic,
    } = body;

    if (!headline || !firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Headline, name, and email are required' }, { status: 400 });
    }

    const profile = await prisma.jobSeekerProfile.upsert({
      where: { userId: session.user.id },
      update: {
        headline, bio, profilePhoto, coverPhoto, firstName, lastName,
        email, phone, city, state,
        isAvailable: isAvailable ?? true,
        desiredJobTypes: desiredJobTypes || [],
        desiredCategories: desiredCategories || [],
        desiredSalaryMin: desiredSalaryMin ? parseFloat(desiredSalaryMin) : null,
        desiredSalaryMax: desiredSalaryMax ? parseFloat(desiredSalaryMax) : null,
        salaryType: salaryType || 'yearly',
        skills: skills || [],
        certifications: certifications || [],
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
        education, resumeUrl, portfolioUrl,
        isPublic: isPublic ?? true,
      },
      create: {
        userId: session.user.id,
        headline, bio, profilePhoto, coverPhoto, firstName, lastName,
        email, phone, city, state,
        isAvailable: isAvailable ?? true,
        desiredJobTypes: desiredJobTypes || [],
        desiredCategories: desiredCategories || [],
        desiredSalaryMin: desiredSalaryMin ? parseFloat(desiredSalaryMin) : null,
        desiredSalaryMax: desiredSalaryMax ? parseFloat(desiredSalaryMax) : null,
        salaryType: salaryType || 'yearly',
        skills: skills || [],
        certifications: certifications || [],
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
        education, resumeUrl, portfolioUrl,
        isPublic: isPublic ?? true,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Failed to save seeker profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
