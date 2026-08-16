export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { JobSeekerProfileForm } from './profile-form';

export const metadata: Metadata = {
  title: 'My Job Profile | Property Flow HQ',
  description: 'Create or edit your job seeker profile',
};

export default async function JobSeekerProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/jobs/profile');
  }

  // Check for existing profile
  let existingProfile = null;
  try {
    existingProfile = await prisma.jobSeekerProfile.findUnique({
      where: { userId: session.user.id },
    });
  } catch {
    // Model may not exist yet if migration hasn't run
  }

  const serialized = existingProfile ? {
    headline: existingProfile.headline,
    bio: existingProfile.bio,
    profilePhoto: existingProfile.profilePhoto,
    coverPhoto: existingProfile.coverPhoto,
    firstName: existingProfile.firstName,
    lastName: existingProfile.lastName,
    email: existingProfile.email,
    phone: existingProfile.phone,
    city: existingProfile.city,
    state: existingProfile.state,
    isAvailable: existingProfile.isAvailable,
    desiredJobTypes: existingProfile.desiredJobTypes,
    desiredCategories: existingProfile.desiredCategories,
    desiredSalaryMin: existingProfile.desiredSalaryMin?.toString() || '',
    desiredSalaryMax: existingProfile.desiredSalaryMax?.toString() || '',
    salaryType: existingProfile.salaryType,
    skills: existingProfile.skills,
    certifications: existingProfile.certifications,
    yearsExperience: existingProfile.yearsExperience?.toString() || '',
    education: existingProfile.education,
    resumeUrl: existingProfile.resumeUrl,
    portfolioUrl: existingProfile.portfolioUrl,
    isPublic: existingProfile.isPublic,
  } : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {existingProfile ? 'Edit Your Profile' : 'Create Your Job Profile'}
        </h1>
        <p className="text-slate-600 mb-8">
          {existingProfile
            ? 'Update your profile to attract employers'
            : 'Let employers find you. Create a free profile showcasing your skills and experience.'}
        </p>
        <JobSeekerProfileForm
          existingProfile={serialized}
          userName={session.user.name || ''}
          userEmail={session.user.email || ''}
        />
      </div>
    </div>
  );
}
