import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Palette, AlertTriangle, ChevronRight } from 'lucide-react';
import { DashboardUsageWidget } from '@/components/contractor/subscription/DashboardUsageWidget';

export default async function ContractorProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'contractor') {
    return redirect('/');
  }

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>My Profile</h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Manage your public profile and branding</p>
      </div>

      {/* Subscription Usage Widget */}
      <DashboardUsageWidget />

      {/* Profile Setup Card */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Contractor Marketplace Profile</h3>
        </div>
        <div className='p-6'>
          <div className='flex items-start gap-4'>
            <div className='h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0'>
              <Palette className='h-6 w-6 text-amber-500' />
            </div>
            <div className='flex-1'>
              <h2 className='text-base font-bold text-gray-800 mb-1'>Set Up Your Public Profile</h2>
              <p className='text-sm text-gray-500 mb-4'>
                Create your public profile to appear in the contractor marketplace.
                Clients will be able to view your portfolio, read reviews, and request quotes.
              </p>
              <Link href='/contractor-dashboard/profile/branding'>
                <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-sm'>
                  Set Up My Profile
                  <ChevronRight className='h-4 w-4 ml-1' />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Note */}
      <div className='flex items-start gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50'>
        <div className='p-1.5 rounded-lg bg-amber-100 shrink-0'>
          <AlertTriangle className='h-4 w-4 text-amber-600' />
        </div>
        <div>
          <p className='text-xs font-semibold text-amber-800'>Database Migration Note</p>
          <p className='text-xs text-amber-700 mt-0.5'>
            If you see an error when clicking &quot;Set Up My Profile&quot;, the database needs to be updated.
            Run: <code className='bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-mono'>npx prisma migrate dev</code>
          </p>
        </div>
      </div>
    </div>
  );
}
