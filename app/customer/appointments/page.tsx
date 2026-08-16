import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { CustomerAppointmentCalendar } from '@/components/customer/customer-appointment-calendar';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Appointments',
};

export default async function CustomerAppointmentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  // Get user's customer records
  const customerRecords = await prisma.contractorCustomer.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (customerRecords.length === 0) {
    redirect('/customer/dashboard');
  }

  const customerIds = customerRecords.map((c) => c.id);

  // Fetch jobs that have a start date (we surface jobs as appointments).
  // ContractorJob doesn't have a `scheduledDate` column — it uses
  // `estimatedStartDate` / `actualStartDate`. We query on those and then
  // alias `estimatedStartDate` → `scheduledDate` for the calendar UI.
  const jobs = await prisma.contractorJob.findMany({
    where: {
      customerId: { in: customerIds },
      OR: [
        { estimatedStartDate: { not: null } },
        { actualStartDate: { not: null } },
      ],
    },
    include: {
      contractor: {
        select: {
          id: true,
          businessName: true,
          displayName: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { estimatedStartDate: 'asc' },
  });

  const appointments = jobs.map((job) => ({
    ...job,
    scheduledDate: job.estimatedStartDate,
  }));

  // Calculate stats
  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (apt) =>
      apt.scheduledDate &&
      new Date(apt.scheduledDate) > now &&
      apt.status !== 'cancelled'
  );
  const completedAppointments = appointments.filter(
    (apt) => apt.status === 'completed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-blue-600">Appointments</h1>
        <p className="text-sm text-gray-600 mt-1">
          Schedule and manage appointments with contractors
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Upcoming</p>
              <p className="text-3xl font-bold text-blue-600">
                {upcomingAppointments.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Scheduled</p>
              <p className="text-3xl font-bold text-gray-900">
                {appointments.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-emerald-600">
                {completedAppointments.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Calendar */}
      <CustomerAppointmentCalendar appointments={appointments} />
    </div>
  );
}
