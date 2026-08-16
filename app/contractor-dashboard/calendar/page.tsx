import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AvailabilityCalendar from '@/components/contractor/calendar/availability-calendar';
import WorkingHoursManager from '@/components/contractor/calendar/working-hours-manager';
import BookingSettings from '@/components/contractor/calendar/booking-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Settings } from 'lucide-react';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export default async function ContractorCalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractor = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
    instantBookingEnabled: true,
  });

  if (!contractor) {
    redirect('/contractor-dashboard');
  }

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div>
        <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>
          Calendar & Availability
        </h1>
        <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
          Manage your schedule, working hours, and booking availability
        </p>
      </div>

      <Tabs defaultValue='calendar' className='space-y-5'>
        <div className='rounded-xl border border-gray-200 bg-white p-1 shadow-sm inline-flex'>
          <TabsList className='bg-transparent gap-1'>
            <TabsTrigger
              value='calendar'
              className='flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-all'
            >
              <Calendar className='h-4 w-4' />
              Calendar
            </TabsTrigger>
            <TabsTrigger
              value='hours'
              className='flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-all'
            >
              <Clock className='h-4 w-4' />
              Hours
            </TabsTrigger>
            <TabsTrigger
              value='settings'
              className='flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-all'
            >
              <Settings className='h-4 w-4' />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='calendar' className='space-y-5'>
          <AvailabilityCalendar contractorId={contractor.id} mode='manage' />
        </TabsContent>

        <TabsContent value='hours' className='space-y-5'>
          <WorkingHoursManager contractorId={contractor.id} />
        </TabsContent>

        <TabsContent value='settings' className='space-y-5'>
          <BookingSettings contractorId={contractor.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
