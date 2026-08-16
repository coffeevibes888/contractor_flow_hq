'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Star, Quote, ArrowRight, Users, Clock, Shield, Briefcase, DollarSign } from 'lucide-react';

const pmReviews = [
  {
    id: '1',
    name: 'Sarah Martinez',
    role: 'Landlord, 8 units',
    rating: 5,
    text: 'Finally, a tool that doesn\'t cost an arm and a leg. I went from spending 10+ hours a month on admin work to maybe 2 hours. The online rent collection alone is worth every penny.',
    location: 'Las Vegas, NV',
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'Property Manager, 24 units',
    rating: 5,
    text: 'The maintenance ticket system changed everything. No more lost texts or forgotten requests. Everything is tracked and organized. My tenants love how easy it is to submit tickets.',
    location: 'Phoenix, AZ',
  },
  {
    id: '3',
    name: 'Jennifer Williams',
    role: 'Landlord, 3 units',
    rating: 5,
    text: 'At $39/month I was skeptical, but it pays for itself in the first hour I save. Buildium wanted $55+ just to start. This has everything I need without the ridiculous price tag.',
    location: 'Reno, NV',
  },
];

const contractorReviews = [
  {
    id: '1',
    name: 'David Ramirez',
    role: 'General Contractor, 6 crew',
    rating: 5,
    text: 'I was juggling texts, paper invoices, and three different apps. Now everything is in one place — jobs, invoices, scheduling. My crew knows exactly where to be and I get paid faster.',
    location: 'Austin, TX',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'HVAC Contractor',
    rating: 5,
    text: 'The marketplace listing alone brought me 4 new property manager clients in the first month. Plus the invoicing is dead simple — send it, they pay online, money hits my account in 2 days.',
    location: 'Denver, CO',
  },
  {
    id: '3',
    name: 'Lisa Nguyen',
    role: 'Plumbing Company Owner, 12 employees',
    rating: 5,
    text: 'Time tracking and payroll used to eat up my entire Sunday. Now my guys clock in on their phones, I approve timesheets in 5 minutes, and payroll is done. Game changer for my business.',
    location: 'Portland, OR',
  },
];

// const pmStats = [
//   { icon: Users,  label: 'Landlords & PMs',   value: '500+' },
//   { icon: Clock,  label: 'Hours saved / month', value: '8+' },
//   { icon: Shield, label: 'Secure & Encrypted',  value: '256-bit' },
// ];

const contractorStats = [
  { icon: Briefcase, label: 'Contractors using it', value: '300+' },
  { icon: DollarSign, label: 'Invoices sent / month', value: '2,000+' },
  { icon: Clock, label: 'Hours saved / week', value: '5+' },
];

const CustomerReviews = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isContractor =
    searchParams.get('for') === 'contractor' || pathname?.startsWith('/contractor') || pathname === '/';

  const reviews = isContractor ? contractorReviews : pmReviews;
  const stats = isContractor ? contractorStats : "";
  const accentColor = isContractor ? 'rose' : 'cyan';

  return (
    <section className='w-full py-16 md:py-24 px-4 bg-slate-50'>
      <div className='max-w-6xl mx-auto space-y-12'>

        {/* Header */}
        <div className='text-center space-y-4'>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${isContractor
              ? 'bg-rose-500/10 border border-rose-500/20'
              : 'bg-cyan-500/10 border border-cyan-500/20'
            }`}>
            <div className='flex items-center gap-0.5'>
              {[...Array(5)].map((_, i) => (
                <Star key={i} className='h-3.5 w-3.5 fill-amber-400 text-amber-400' />
              ))}
            </div>
          </div>
          <h2 className='text-3xl md:text-4xl font-black text-slate-900'>
            {isContractor ? 'Real Contractors.' : 'Real Landlords.'}{' '}
            <span className={`bg-clip-text text-transparent ${isContractor
                ? 'bg-gradient-to-r from-rose-400 to-orange-400'
                : 'bg-gradient-to-r from-cyan-400 to-blue-800'
              }`}>Real Results.</span>
          </h2>
          <p className='text-slate-500 max-w-xl mx-auto text-sm md:text-base'>
            {isContractor
              ? 'Contractors across the country ditched the spreadsheets and duct-taped apps. Here\u2019s what they say.'
              : 'Property managers across the country switched from expensive software and spreadsheets. Here\u2019s what they say.'}
          </p>
        </div>


        {/* Review cards */}
        <div className='grid gap-6 md:grid-cols-3'>
          {reviews.map((review, index) => (
            <article
              key={review.id}
              className={`group relative rounded-2xl border bg-white p-6 space-y-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] ${isContractor
                  ? 'border-slate-200 hover:border-rose-300'
                  : 'border-slate-200 hover:border-cyan-300'
                }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className='absolute top-4 right-4 opacity-20 group-hover:opacity-50 transition-opacity'>
                <Quote className={`h-8 w-8 ${isContractor ? 'text-rose-400' : 'text-cyan-400'}`} />
              </div>

              <div className='flex items-center gap-1'>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-700 text-slate-700'
                      }`}
                  />
                ))}
              </div>

              <p className='text-sm text-slate-600 leading-relaxed relative z-10'>
                &ldquo;{review.text}&rdquo;
              </p>

              <div className='pt-4 border-t border-slate-200'>
                <div className='flex items-center gap-3'>
                  <div className={`h-10 w-10 rounded-full border flex items-center justify-center ${isContractor
                      ? 'bg-gradient-to-br from-rose-500/30 to-orange-500/30 border-rose-500/30'
                      : 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-cyan-500/30'
                    }`}>
                    <span className={`font-bold text-sm ${isContractor ? 'text-rose-300' : 'text-cyan-300'}`}>
                      {review.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className='font-semibold text-slate-900 text-sm'>{review.name}</div>
                    <div className='text-xs text-slate-400'>{review.role}</div>
                    <div className='text-xs text-slate-500'>{review.location}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className='text-center'>
          <Link
            href={isContractor ? '/sign-up?role=contractor' : '/sign-up'}
            className={`inline-flex items-center gap-2 rounded-full text-white px-8 py-3.5 text-sm font-bold shadow-xl hover:scale-105 transition-transform duration-200 ${isContractor
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/20'
              }`}
          >
            Start 14-day free trial
            <ArrowRight className='h-4 w-4' />
          </Link>

        </div>
      </div>
    </section>
  );
};

export default CustomerReviews;
