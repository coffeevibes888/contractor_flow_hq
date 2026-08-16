'use client';

import { useState } from 'react';
import { Globe, GlobeLock, ChevronDown, ToggleRight } from 'lucide-react';

export function ListingToggleTip() {
  const [open, setOpen] = useState(false);

  return (
    <div className='rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50'>
      <button
        onClick={() => setOpen((o) => !o)}
        className='w-full flex items-center justify-between gap-2 px-4 py-3 text-left'
      >
        <div className='flex items-center gap-2'>
          <div className='h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 shadow-sm'>
            <ToggleRight className='h-4 w-4 text-white' />
          </div>
          <span className='text-sm font-semibold text-slate-700'>
            How does the Available / Occupied toggle work?
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className='px-4 pb-4 border-t border-cyan-100'>
          <div className='pt-3 grid sm:grid-cols-2 gap-3'>
            {/* Available state */}
            <div className='flex items-start gap-3 rounded-lg bg-white border border-emerald-100 px-3 py-2.5 shadow-sm'>
              <span className='mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0'>
                <Globe className='h-2.5 w-2.5' />
                Available
              </span>
              <p className='text-xs text-slate-500 leading-relaxed'>
                The unit is <span className='font-semibold text-slate-700'>visible on the public listings page.</span>{' '}
                Prospective tenants can view it, schedule a showing, and submit a rental application.
              </p>
            </div>

            {/* Occupied state */}
            <div className='flex items-start gap-3 rounded-lg bg-white border border-amber-100 px-3 py-2.5 shadow-sm'>
              <span className='mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shrink-0'>
                <GlobeLock className='h-2.5 w-2.5' />
                Occupied
              </span>
              <p className='text-xs text-slate-500 leading-relaxed'>
                The unit is <span className='font-semibold text-slate-700'>hidden from the public.</span>{' '}
                No one can view, schedule, or apply until you toggle it back to Available.
              </p>
            </div>
          </div>

          {/* Auto-off explanation */}
          <div className='mt-3 rounded-lg bg-white border border-blue-100 px-3 py-2.5 shadow-sm'>
            <p className='text-xs text-slate-500 leading-relaxed'>
              <span className='font-semibold text-slate-700'>Automatic toggle — </span>
              once a rental application is approved and a tenant is assigned to a unit, the listing is
              automatically switched to <span className='font-semibold text-amber-600'>Occupied</span> so the unit
              is no longer shown as available. When the tenant moves out, simply toggle it back to{' '}
              <span className='font-semibold text-emerald-600'>Available</span> to re-list the unit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
