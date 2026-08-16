import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import PropertyForm from '@/components/landlord/str/property-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Add Property | Short-Term Rentals',
};

export default async function NewPropertyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const landlord = await prisma.landlord.findFirst({
    where: { ownerUserId: session.user.id },
  });

  if (!landlord) {
    redirect('/onboarding/landlord');
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/landlord/str/properties"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-blue-600 mb-1">Add Property</h1>
          <p className="text-sm text-gray-600">
            Create a new short-term rental listing
          </p>
        </div>
      </div>

      {/* Form */}
      <PropertyForm mode="create" />
    </div>
  );
}
