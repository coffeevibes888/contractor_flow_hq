import Link from 'next/link';
import { Check, X, ArrowRight, Trophy } from 'lucide-react';

type CellVal = 'yes' | 'no' | 'extra' | string;

interface CompRow {
  feature: string;
  vals: [CellVal, CellVal, CellVal, CellVal];
}

// ── PM comparison ─────────────────────────────────────────────────
const pmRows: CompRow[] = [
  { feature: 'Monthly price', vals: ['$39.99 flat', '$62–$400/mo', '$1.40–$5.00/unit ($280 min)', '$1.00–$2.00/unit ($100 min)'] },
  { feature: 'Setup / Onboarding fee', vals: ['Free', '$99/bank ', '$400+', 'Free'] },
  { feature: 'Online Payments / ACH', vals: ['$0', '$2.35/EFT Ess.', '$0.25/ACH)', 'Extra$'] },
  { feature: 'E-Signatures', vals: ['yes', 'Extra$', 'Included (Core+)', 'Premier only'] },
  { feature: 'Maintenance Tracking', vals: ['yes', 'Included (Growth+)', 'Included', 'Included'] },
  { feature: 'Free Lease Builder', vals: ['yes', 'No', 'No', 'Limited (Premier only)'] },
  { feature: 'Leases', vals: ['Unlimited', 'Yes', 'Yes', 'Yes'] },
  { feature: 'Applications', vals: ['Unlimited', 'yes', 'yes', 'Yes'] },
  { feature: 'Minimum Units Required', vals: ['None', 'None', '50 units', 'None'] },
  { feature: 'Transaction Fees', vals: ['None', '$0.60–$2.35/EFT + 2.99% CC', 'Yes', 'Yes'] },
];

const pmCols = ['PropertyFlow HQ', 'Buildium', 'AppFolio', 'Yardi Breeze'];

// ── Contractor comparison ─────────────────────────────────────────
const contractorRows: CompRow[] = [
  { feature: 'Monthly price', vals: ['$99', '$300+', 'Per lead', '$129+'] },
  { feature: 'Cost per job/lead', vals: ['$0', '$15-80+', '$15-50+', '$0'] },
  { feature: 'Jobs & work orders', vals: ['yes', 'no', 'no', 'yes'] },
  { feature: 'Invoicing & estimates', vals: ['yes', 'no', 'no', 'yes'] },
  { feature: 'Team scheduling', vals: ['yes', 'no', 'no', 'Pro+'] },
  { feature: 'GPS time tracking', vals: ['yes', 'no', 'no', 'extra'] },
  { feature: 'Branded profile page', vals: ['yes', 'no', 'no', 'no'] },
  { feature: 'Property Manager access', vals: ['yes', 'no', 'no', 'no'] },
  { feature: 'Inventory tracking', vals: ['yes', 'no', 'no', 'Pro+'] },
];

const contractorCols = ['PropertyFlow HQ', 'Angi Leads', 'Thumbtack', 'Jobber'];

function Cell({ val, isUs, accentColor }: { val: CellVal; isUs: boolean; accentColor: string }) {
  if (val === 'yes') {
    return (
      <span className='flex justify-center'>
        <Check className={`h-4 w-4 ${isUs ? accentColor : 'text-emerald-500'}`} />
      </span>
    );
  }
  if (val === 'no') {
    return (
      <span className='flex justify-center'>
        <X className='h-4 w-4 text-red-400/50' />
      </span>
    );
  }
  if (val === 'extra') {
    return <span className='block text-center text-xs font-bold text-amber-700'>Extra $</span>;
  }
  return (
    <span className={`block text-center text-sm sm:text-base font-bold ${isUs ? accentColor : 'text-slate-700'}`}>
      {val}
    </span>
  );
}

export default function ComparisonSection({ variant = 'pm' }: { variant?: 'pm' | 'contractor' }) {
  const isPM = variant === 'pm';
  const rows = isPM ? pmRows : contractorRows;
  const cols = isPM ? pmCols : contractorCols;

  const gradientCls = isPM ? 'from-cyan-500 to-blue-600' : 'from-rose-500 to-orange-500';
  const accentText = isPM ? 'text-cyan-600' : 'text-rose-600';
  const accentCell = isPM ? 'text-cyan-600' : 'text-rose-600';
  const badgeCls = isPM
    ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
    : 'bg-rose-50 border-rose-200 text-rose-700';
  const signUpHref = isPM ? '/sign-up' : '/sign-up?role=contractor';

  return (
    <section className='w-full py-12 md:py-20 px-4 md:px-4 bg-slate-50'>
      <div className='max-w-6xl mx-auto space-y-8 overflow-hidden'>

        {/* Commented out comparison table - keeping only "Real Pricing. No Surprises." section below */}
        {/*
        <div className='text-center space-y-3'>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold border ${badgeCls}`}>
            <Trophy className='h-4 w-4' />
            {isPM ? 'The Honest Comparison' : 'Stop Paying Per Lead'}
          </div>
          <h2 className='text-3xl sm:text-4xl md:text-5xl font-black text-slate-900'>
            {isPM
              ? "We're Half the Price."
              : 'More Features.'}{' '}
            <span className={`bg-gradient-to-r ${isPM ? 'from-cyan-500 to-blue-600' : 'from-rose-500 to-orange-500'} bg-clip-text text-transparent`}>
              {isPM ? 'Twice the Features.' : 'One Flat Price.'}
            </span>
          </h2>
          <p className='text-base md:text-lg text-slate-700 max-w-2xl mx-auto'>
            {isPM
              ? "Compare us to the industry leaders."
              : "Angi and Thumbtack charge you hundreds just to compete for a single job. We don't."}
          </p>
        </div>

        <div className='relative overflow-x-auto rounded-2xl border border-blue-200 shadow-lg bg-blue-50'>
          <table className='w-full border-collapse bg-transparent text-left'>
            <thead>
              <tr>
                <th className='px-4 py-5 text-sm font-bold uppercase tracking-wider text-slate-700 w-[35%] border-b border-blue-200 bg-blue-100'>
                  Feature
                </th>
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className={`px-3 py-4 text-center border-b border-blue-200 ${i === 0 ? 'bg-cyan-100' : 'bg-blue-100'}`}
                  >
                    {i === 0 ? (
                      <div className='flex flex-col items-center gap-1'>
                        <span className={`text-sm font-black uppercase tracking-wide ${accentText}`}>{col}</span>
                        <span className='inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30'>
                          ✓ Best Value
                        </span>
                      </div>
                    ) : (
                      <span className='text-sm font-semibold text-slate-700'>{col}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-blue-100 transition-colors hover:bg-cyan-50/60 ${i % 2 === 0 ? 'bg-blue-50/40' : 'bg-blue-100/40'}`}
                >
                  <td className='px-4 py-4 text-sm sm:text-base font-semibold text-slate-700'>
                    {row.feature}
                  </td>
                  {row.vals.map((val, vi) => (
                    <td key={vi} className={`px-3 py-4 ${vi === 0 ? 'bg-cyan-100/80' : ''}`}>
                      <Cell val={val} isUs={vi === 0} accentColor={accentCell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='text-center pt-2'>
          <Link
            href={signUpHref}
            className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${gradientCls} text-white px-8 py-3.5 text-sm font-bold shadow-xl hover:scale-105 transition-transform duration-200`}
          >
            Start 14-day free trial
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
        */}

        {/* Unit-count pricing comparison — PM only */}
        {isPM && (
          <div className='space-y-6 pt-8'>
            <div className='text-center space-y-2'>
              <h3 className='text-2xl sm:text-3xl font-black text-slate-900'>Real Pricing. No Surprises.</h3>
              <p className='text-sm md:text-base text-slate-600 max-w-xl mx-auto'>
                Here's exactly what you'd pay at each portfolio size — compared to the competition.
              </p>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              {/* Up to 24 units */}
              <div className='rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-md'>
                <div className='space-y-1'>
                  <p className='text-xs font-bold text-slate-400 uppercase tracking-wide'>Up to 24 Units</p>
                  <p className='text-sm text-slate-600'>Small portfolio / just starting out</p>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Property Flow HQ</span>
                    <span className='text-xl font-black text-cyan-600'>$39.99<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Buildium</span>
                    <span className='text-xl font-black text-slate-900'>$62<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>AppFolio</span>
                    <span className='text-xl font-black text-slate-900 text-right'>Not available<span className='text-xs font-normal text-slate-500 block'>50-unit minimum</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Yardi Breeze</span>
                    <span className='text-xl font-black text-slate-900'>$100<span className='text-xs font-normal text-slate-500'>/mo min</span></span>
                  </div>
                </div>
                <div className='rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-center'>
                  <span className='text-xs font-bold text-cyan-700'>You save $22/mo vs Buildium · $60/mo vs Yardi</span>
                </div>
              </div>

              {/* 25–150 units */}
              <div className='rounded-2xl border-2 border-cyan-300 bg-gradient-to-b from-cyan-50 to-white p-6 space-y-4 shadow-lg relative'>
                <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                  <span className='bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md'>MOST POPULAR</span>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs font-bold text-slate-400 uppercase tracking-wide'>25 – 150 Units</p>
                  <p className='text-sm text-slate-600'>Growing property manager</p>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Property Flow HQ</span>
                    <span className='text-xl font-black text-cyan-600'>$99.99<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Buildium</span>
                    <span className='text-xl font-black text-slate-900'>$192<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>AppFolio</span>
                    <span className='text-xl font-black text-slate-900'>$280–$900+<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Yardi Breeze</span>
                    <span className='text-xl font-black text-slate-900'>$200<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                </div>
                <div className='rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-center'>
                  <span className='text-xs font-bold text-cyan-700'>All features included · No per-unit fees · No add-ons</span>
                </div>
              </div>

              {/* Unlimited */}
              <div className='rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-md'>
                <div className='space-y-1'>
                  <p className='text-xs font-bold text-slate-400 uppercase tracking-wide'>Unlimited Everything</p>
                  <p className='text-sm text-slate-600'>Scale without limits</p>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Property Flow HQ</span>
                    <span className='text-xl font-black text-cyan-600'>$199.99<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Buildium</span>
                    <span className='text-xl font-black text-slate-900'>$400<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>AppFolio</span>
                    <span className='text-xl font-black text-slate-900'>$1,500+<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                  <div className='flex items-baseline justify-between'>
                    <span className='text-sm font-semibold text-slate-700'>Yardi Breeze</span>
                    <span className='text-xl font-black text-slate-900'>$400–$500+<span className='text-xs font-normal text-slate-500'>/mo</span></span>
                  </div>
                </div>
                <div className='rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-center'>
                  <span className='text-xs font-bold text-cyan-700'>You save $190–$200/mo vs Buildium · $1,300–$2,300/mo vs AppFolio</span>
                </div>
              </div>
            </div>

            <p className='text-center text-xs text-slate-400'>
              Pricing based on publicly available rates as of June 2026. Buildium charges $0.60–$2.35 per ACH/EFT + 2.99% on credit cards. AppFolio has a 50-unit minimum. Yardi requires an annual contract.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
