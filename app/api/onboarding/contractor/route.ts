import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { canonicalUrl } from '@/lib/seo';
import { indexNowSubmit } from '@/lib/seo/indexnow';
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
      companyName, 
      licenseNumber, 
      insuranceProvider, 
      specialties, 
      serviceAreas,
      inviteCode 
    } = body;

    // Update user role and onboarding status
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: 'contractor',
        onboardingCompleted: true,
        onboardingStep: null,
        name: companyName || session.user.name,
      },
      select: { id: true, email: true, name: true },
    });

    // Create ContractorProfile if it doesn't already exist.
    // This is required so SubscriptionGate can find the profile and allow access.
    const existingProfile = await prisma.contractorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!existingProfile) {
      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      // Generate a URL-safe slug: companyname-4randomchars
      const baseName = (companyName || updatedUser.name || 'contractor')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
      const suffix = Math.random().toString(36).slice(2, 6);
      const slug = `${baseName}-${suffix}`;

      await prisma.contractorProfile.create({
        data: {
          userId: session.user.id,
          slug,
          businessName: companyName || updatedUser.name || 'My Contractor Business',
          displayName: companyName || updatedUser.name || 'Contractor',
          email: updatedUser.email || '',
          specialties: specialties || [],
          serviceAreas: serviceAreas
            ? serviceAreas.split(',').map((s: string) => s.trim())
            : [],
          licenseNumber: licenseNumber || null,
          subscriptionTier: 'starter',
          subscriptionStatus: 'trialing',
          trialStatus: 'trialing',
          trialStartDate,
          trialEndDate,
        },
      });

      // Tell Bing/IndexNow about the new public profile so it gets crawled
      // within minutes instead of waiting for the next sitemap pass.
      // Best-effort — never blocks the onboarding response.
      void indexNowSubmit([
        canonicalUrl(`/${slug}`),
        canonicalUrl('/contractor-marketplace'),
      ]);
    }

    let linked = false;

    // If invite code provided, try to link to landlord
    if (inviteCode) {
      const invite = await prisma.contractorInvite.findFirst({
        where: {
          token: inviteCode.toUpperCase(), // Codes are uppercase
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
        include: {
          contractor: true,
        },
      });

      if (invite) {
        // Update the placeholder contractor with real user info
        await prisma.contractor.update({
          where: { id: invite.contractorId },
          data: {
            userId: session.user.id,
            name: companyName || session.user.name || 'Contractor',
            email: session.user.email || '',
            specialties: specialties || [],
          },
        });

        // Update invite status
        await prisma.contractorInvite.update({
          where: { id: invite.id },
          data: { 
            status: 'accepted',
            email: session.user.email || invite.email,
          },
        });

        linked = true;
      }
    }

    // If no valid invite code, contractor is registered but not linked to any landlord yet
    // They'll appear in the marketplace and can be invited by landlords later

    return NextResponse.json({ success: true, linked });
  } catch (error) {
    console.error('Contractor onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
