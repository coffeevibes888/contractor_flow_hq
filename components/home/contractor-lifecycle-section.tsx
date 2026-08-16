// Shared contractor job lifecycle section — used on both the homepage (/?for=contractor)
// and the dedicated /contractor landing page.
//
// Palette: rose-500 → orange-400 → amber-400 (matches the contractor hero).
// Cards live on a soft cream/rose background so the page reads warm + light
// instead of dark/rust.

export function ContractorLifecycleSection() {
  return (
    <section className='w-full py-10 md:py-20 px-4'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {/* Headline */}
        <div className='text-center space-y-3 max-w-3xl mx-auto'>
          <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent'>
            Complete Job Lifecycle
          </h2>
          <p className='text-sm sm:text-base md:text-lg text-slate-700 leading-relaxed'>
            From the first lead to the final payment — every step of your job is tracked, automated, and connected.
            No more juggling spreadsheets, texts, and paper invoices. One flow handles quoting, contracts, scheduling, invoicing, and getting paid.
          </p>
          <div className='flex flex-wrap items-center justify-center gap-3 pt-2'>
            {[
              'Auto Invoicing',
              'E-Signature Contracts',
              'Built-in Scheduling',
              'Get Paid Faster',
            ].map((label) => (
              <span
                key={label}
                className='inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200'
              >
                <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2.5}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className='grid gap-4 md:gap-6 md:grid-cols-2'>
          <div className='md:col-span-2 group relative rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.01] bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 border border-rose-200/70 shadow-xl'>
            <div className='absolute top-4 right-4 md:top-6 md:right-6'>
              <span className='inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm text-rose-600 text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full border border-rose-200'>
                <span className='relative flex h-2 w-2'>
                  <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75'></span>
                  <span className='relative inline-flex rounded-full h-2 w-2 bg-rose-500'></span>
                </span>
                AUTOMATED
              </span>
            </div>
            <div className='relative p-6 md:p-8 space-y-4 md:space-y-6'>
              <div className='space-y-2'>
                <h3 className='text-2xl md:text-3xl font-bold bg-gradient-to-r from-rose-600 to-orange-500 bg-clip-text text-transparent'>
                  From Lead to Payment
                </h3>
                <p className='text-slate-700 text-sm md:text-base font-medium'>
                  Every job follows this flow — automatically.
                </p>
              </div>

              {/* Mobile layout */}
              <div className='lg:hidden space-y-2'>
                {[
                  [
                    { label: 'Lead Comes In', sub: 'Marketplace or Direct' },
                    { label: 'Send Quote', sub: 'Built-in Quote Builder' },
                  ],
                  [
                    { label: 'Customer Accepts', sub: 'One Click Approval' },
                    { label: 'Contract Auto-Sent', sub: 'E-Signature Ready' },
                  ],
                  [
                    { label: 'Customer Signs', sub: 'Legally Binding' },
                    { label: 'Job Created', sub: 'Auto-Scheduled' },
                  ],
                  [
                    { label: 'Upload Photos', sub: 'Before / During / After' },
                    { label: 'Track Progress', sub: 'Real-Time Updates' },
                  ],
                  [
                    { label: 'Job Complete', sub: 'Customer Notified' },
                    { label: 'Invoice Sent', sub: 'Auto-Generated' },
                  ],
                  [
                    { label: 'Get Paid', sub: 'Direct to Bank' },
                    { label: 'Get Reviews', sub: 'Auto-Requested' },
                  ],
                ].map((row, i) => (
                  <div key={i} className='flex items-center gap-1 sm:gap-2'>
                    <FlowChip label={row[0].label} sub={row[0].sub} />
                    <FlowArrow />
                    <FlowChip label={row[1].label} sub={row[1].sub} />
                  </div>
                ))}
              </div>

              {/* Desktop layout */}
              <div className='hidden lg:block space-y-4'>
                {/* Row 1 */}
                <div className='flex items-center justify-between gap-3'>
                  {[
                    { label: 'Lead Comes In', sub: 'Marketplace or Direct' },
                    { label: 'Send Quote', sub: 'Built-in Quote Builder' },
                    { label: 'Customer Accepts', sub: 'One Click Approval' },
                    { label: 'Contract Auto-Sent', sub: 'E-Signature Ready' },
                    { label: 'Customer Signs', sub: 'Legally Binding' },
                  ].map((node, i, arr) => (
                    <div key={node.label} className='flex items-center gap-3 flex-1'>
                      <FlowChip label={node.label} sub={node.sub} />
                      {i < arr.length - 1 && <FlowArrow />}
                    </div>
                  ))}
                </div>

                {/* Connector down */}
                <div className='flex justify-end pr-[50px]'>
                  <div className='flex flex-col items-center'>
                    <div className='w-0.5 h-4 border-l-2 border-dashed border-rose-300'></div>
                    <FlowArrow rotate />
                  </div>
                </div>

                {/* Row 2 — reversed */}
                <div className='flex items-center justify-between gap-3'>
                  {[
                    { label: 'Get Reviews', sub: 'Auto-Requested' },
                    { label: 'Get Paid', sub: 'Direct to Bank' },
                    { label: 'Invoice Sent', sub: 'Auto-Generated' },
                    { label: 'Job Complete', sub: 'Customer Notified' },
                    { label: 'Job Auto-Created', sub: 'Scheduled & Tracked' },
                  ].map((node, i) => (
                    <div key={node.label} className='flex items-center gap-3 flex-1'>
                      {i > 0 && <FlowArrow flip />}
                      <FlowChip label={node.label} sub={node.sub} />
                    </div>
                  ))}
                </div>

                {/* Connector down */}
                <div className='flex justify-start pl-[50px]'>
                  <div className='flex flex-col items-center'>
                    <div className='w-0.5 h-4 border-l-2 border-dashed border-rose-300'></div>
                    <FlowArrow rotate />
                  </div>
                </div>

                {/* Row 3 — extras */}
                <div className='flex items-center gap-3'>
                  <FlowChip label='Upload Photos' sub='Before / During / After' />
                  <FlowArrow />
                  <FlowChip label='Change Orders' sub='Scope & Price Updates' />
                  <FlowArrow />
                  <FlowChip label='Warranty Tracking' sub='Auto Reminders' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowChip({ label, sub }: { label: string; sub: string }) {
  return (
    <div className='flex-1 bg-white rounded-lg px-3 py-2.5 border border-rose-200 text-center min-w-[100px] shadow-sm'>
      <div className='text-rose-700 text-[10px] sm:text-xs font-bold leading-tight'>{label}</div>
      <div className='text-slate-500 text-[8px] sm:text-[10px] mt-0.5 font-semibold'>{sub}</div>
    </div>
  );
}

function FlowArrow({ rotate, flip }: { rotate?: boolean; flip?: boolean } = {}) {
  return (
    <svg
      className={`h-4 w-4 text-orange-400 shrink-0 ${rotate ? 'rotate-90' : ''} ${flip ? 'rotate-180' : ''}`}
      fill='currentColor'
      viewBox='0 0 20 20'
    >
      <path
        fillRule='evenodd'
        d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
        clipRule='evenodd'
      />
    </svg>
  );
}
