import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import AccountSettingsClient from './account-settings-client';

export const metadata: Metadata = {
  title: 'Account Settings | Contractor Dashboard',
  description: 'Manage your account details, avatar, and preferences',
};

export default async function AccountSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Anyone whose dashboard is /contractor-dashboard can manage their own
  // account — this is personal profile data (name, avatar, password, phone),
  // not contractor-business data.
  const allowedRoles = new Set(['contractor', 'contractor_employee']);
  if (!allowedRoles.has(session.user.role)) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phoneNumber: true,
      notificationPreferences: true,
    },
  });

  if (!user) redirect('/sign-in');

  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      businessName: true,
      displayName: true,
      email: true,
      phone: true,
      profilePhoto: true,
      baseCity: true,
      baseState: true,
    },
  });

  return (
    <AccountSettingsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phoneNumber: user.phoneNumber,
        notificationPreferences: user.notificationPreferences as Record<string, boolean> | null,
      }}
      profile={profile}
    />
  );
}
