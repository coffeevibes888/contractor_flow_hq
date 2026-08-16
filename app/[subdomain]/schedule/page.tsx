import { notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { detectSubdomainEntity } from '@/lib/utils/subdomain-detection';
import { Mail, Phone } from 'lucide-react';
import BookingCalendar from './booking-calendar';

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  const entity = await detectSubdomainEntity(subdomain);
  
  if (entity.type !== 'contractor') {
    notFound();
  }

  const contractor = entity.data;
  const brandName = contractor.businessName;

  return (
    <main className="flex-1 w-full min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Schedule an Appointment
          </h1>
          <p className="text-lg text-slate-300">
            Book a time with {brandName}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 md:p-12">
          <BookingCalendar 
            contractorId={contractor.id}
            contractorName={brandName}
          />

          {/* Quick Contact Options */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-center text-slate-400 mb-4">
              Prefer to reach out directly?
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {contractor.phone && (
                <a
                  href={`tel:${contractor.phone}`}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {contractor.phone}
                </a>
              )}
              {contractor.email && (
                <a
                  href={`mailto:${contractor.email}`}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Email Us
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
