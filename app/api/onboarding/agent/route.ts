import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { NextResponse } from 'next/server';

// Roles that cannot be changed through onboarding - these are privileged system roles
const PROTECTED_ROLES = ['superAdmin', 'admin'];

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has a protected role that cannot be changed via onboarding
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (currentUser && PROTECTED_ROLES.includes(currentUser.role)) {
      return NextResponse.json(
        { error: `Cannot change role for ${currentUser.role} accounts through onboarding` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      licenseNumber, 
      licenseState, 
      brokerage, 
      yearsExperience, 
      specializations, 
      serviceAreas,
      subdomain 
    } = body;

    // Validate subdomain
    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 });
    }

    // Check if subdomain is already taken
    const existingAgent = await prisma.agent.findUnique({
      where: { subdomain },
    });

    if (existingAgent) {
      return NextResponse.json({ error: 'This URL is already taken' }, { status: 400 });
    }

    // Also check landlord subdomains
    const existingLandlord = await prisma.landlord.findUnique({
      where: { subdomain },
    });

    if (existingLandlord) {
      return NextResponse.json({ error: 'This URL is already taken' }, { status: 400 });
    }

    // Create agent profile and update user
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          role: 'agent',
          onboardingCompleted: true,
          onboardingStep: null,
        },
      }),
      prisma.agent.create({
        data: {
          userId: session.user.id,
          name: session.user.name || 'Agent',
          subdomain,
          licenseNumber: licenseNumber || null,
          licenseState: licenseState || null,
          brokerage: brokerage || null,
          yearsExperience: yearsExperience ? parseInt(yearsExperience.replace('+', '')) : null,
          specializations: specializations || [],
          serviceAreas: serviceAreas ? serviceAreas.split(',').map((s: string) => s.trim()) : [],
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agent onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
