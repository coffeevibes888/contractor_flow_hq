import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { formatCurrency } from '@/lib/utils';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { DollarSign, Clock, AlertCircle, CheckCircle2, Users, ChevronRight, ScrollText } from 'lucide-react';
import Link from 'next/link';

export default async function RentManagementPage() {
  await requireAdmin();

  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success || !landlordResult.landlord) {
    throw new Error(landlordResult.message || 'Unable to determine landlord');
  }

  const landlordId = landlordResult.landlord.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rentPayments = await prisma.rentPayment.findMany({
    where: {
      dueDate: { gte: startOfMonth, lt: startOfNextMonth },
      NOT: [
        { metadata: { path: ['type'], equals: 'first_month_rent' } },
        { metadata: { path: ['type'], equals: 'last_month_rent' } },
        { metadata: { path: ['type'], equals: 'security_deposit' } },
      ],
      lease: { unit: { property: { landlordId } } },
    },
    orderBy: { dueDate: 'asc' },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      lease: {
        select: {
          id: true, rentAmount: true,
          unit: { select: { name: true, property: { select: { name: true } } } },
        },
      },
    },
  });

  const moveInPayments = await prisma.rentPayment.findMany({
    where: {
      status: 'pending',
      OR: [
        { metadata: { path: ['type'], equals: 'first_month_rent' } },
        { metadata: { path: ['type'], equals: 'last_month_rent' } },
        { metadata: { path: ['type'], equals: 'security_deposit' } },
      ],
      lease: { unit: { property: { landlordId } } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      lease: {
        select: {
          id: true, rentAmount: true,
          unit: { select: { name: true, property: { select: { name: true } } } },
        },
      },
    },
  });

  const paidMoveInPayments = await prisma.rentPayment.findMany({
    where: {
      status: 'paid',
      paidAt: { gte: startOfMonth, lt: startOfNextMonth },
      OR: [
        { metadata: { path: ['type'], equals: 'first_month_rent' } },
        { metadata: { path: ['type'], equals: 'last_month_rent' } },
        { metadata: { path: ['type'], equals: 'security_deposit' } },
      ],
      lease: { unit: { property: { landlordId } } },
    },
    orderBy: { paidAt: 'asc' },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      lease: {
        select: {
          id: true, rentAmount: true,
          unit: { select: { name: true, property: { select: { name: true } } } },
        },
      },
    },
  });

  // Group move-in payments by tenant
  const moveInByTenant = moveInPayments.reduce((acc, p) => {
    const tenantId = p.tenantId;
    if (!acc[tenantId]) {
      acc[tenantId] = { tenant: p.tenant, lease: p.lease, payments: [] };
    }
    acc[tenantId].payments.push(p);
    return acc;
  }, {} as Record<string, { tenant: typeof moveInPayments[0]['tenant']; lease: typeof moveInPayments[0]['lease']; payments: typeof moveInPayments }>);

  const paidThisMonth = [...rentPayments.filter((p) => p.status === 'paid'), ...paidMoveInPayments];
  const lateThisMonth = rentPayments.filter((p) => p.status === 'overdue' || (p.status !== 'paid' && p.dueDate < now));
  const partialPayments = rentPayments.filter((p) => {
    const rent = Number(p.lease.rentAmount);
    const amt = Number(p.amount);
    return p.status === 'paid' && rent > 0 && amt > 0 && amt < rent;
  });

  const totalCollected = paidThisMonth.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalLate = lateThisMonth.reduce((sum, p) => sum + Number(p.lease.rentAmount), 0);
  const pendingMoveIn = Object.values(moveInByTenant).reduce(
    (sum, group) => sum + group.payments.reduce((s, p) => s + Number(p.amount), 0), 0
  );

  const formatUnitLabel = (p: (typeof rentPayments)[number]) => {
    const unitName = p.lease.unit?.name;
    const propertyName = p.lease.unit?.property?.name;
    if (unitName && propertyName) return `${propertyName} · ${unitName}`;
    return propertyName || unitName || 'Unit';
  };

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Rents Overview</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            What was collected and what is still outstanding — for the current month.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link
            href='/admin/accounting/rent-roll'
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors'
          >
            <ScrollText className='h-3.5 w-3.5' />
            View Rent Roll (per-unit)
          </Link>
          <span className='text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full'>
            {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className='rounded-lg border border-sky-100 bg-sky-50/50 p-3 text-xs text-sky-900'>
        <p>
          <strong>What is this page?</strong> A quick look at this month&rsquo;s rent activity — what came in, what is late, what is pending.
          For a per-unit view (market rent vs. actual rent, occupancy, outstanding balances), open the{' '}
          <Link href='/admin/accounting/rent-roll' className='underline font-medium hover:text-sky-700'>
            Rent Roll
          </Link>{' '}
          in Accounting.
        </p>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <KPICard title='Collected' value={formatCurrency(totalCollected)} subtitle={`${paidThisMonth.length} payments`} icon={CheckCircle2} gradient='from-emerald-400 to-cyan-400' />
        <KPICard title='Late' value={formatCurrency(totalLate)} subtitle={`${lateThisMonth.length} overdue`} icon={Clock} gradient='from-red-400 to-rose-400' />
        <KPICard title='Move-in Pending' value={formatCurrency(pendingMoveIn)} subtitle={`${Object.keys(moveInByTenant).length} tenants`} icon={Users} gradient='from-blue-400 to-indigo-400' />
        <KPICard title='Partial' value={String(partialPayments.length)} subtitle='incomplete' icon={AlertCircle} gradient='from-amber-400 to-orange-400' />
      </div>

      {/* Pending Move-in Payments */}
      {Object.keys(moveInByTenant).length > 0 && (
        <Section title='Pending Move-in Payments' subtitle='First month, last month rent, and security deposits'>
          <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
            {Object.values(moveInByTenant).map((group) => {
              const firstMonth = group.payments.find((p) => (p.metadata as any)?.type === 'first_month_rent');
              const lastMonth = group.payments.find((p) => (p.metadata as any)?.type === 'last_month_rent');
              const securityDeposit = group.payments.find((p) => (p.metadata as any)?.type === 'security_deposit');
              const totalDue = group.payments.reduce((sum, p) => sum + Number(p.amount), 0);
              const unitName = group.lease.unit?.name;
              const propertyName = group.lease.unit?.property?.name;
              const unitLabel = unitName && propertyName ? `${propertyName} · ${unitName}` : propertyName || unitName || 'Unit';

              return (
                <div key={group.tenant?.id || group.payments[0]?.id} className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
                  <div className='flex items-start justify-between mb-3'>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-semibold text-gray-800 truncate'>{group.tenant?.name || 'Tenant'}</p>
                      <p className='text-[10px] text-gray-500 truncate'>{unitLabel}</p>
                    </div>
                    <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600'>Pending</span>
                  </div>
                  <div className='space-y-1.5 text-xs'>
                    <PaymentRow label='First month' value={firstMonth ? formatCurrency(Number(firstMonth.amount)) : '—'} />
                    <PaymentRow label='Last month' value={lastMonth ? formatCurrency(Number(lastMonth.amount)) : '—'} />
                    <PaymentRow label='Security deposit' value={securityDeposit ? formatCurrency(Number(securityDeposit.amount)) : '—'} />
                  </div>
                  <div className='pt-3 mt-3 border-t border-gray-100 flex items-center justify-between'>
                    <span className='text-xs text-gray-500'>Total due</span>
                    <span className='text-base font-bold text-gray-900'>{formatCurrency(totalDue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Paid This Month */}
      <Section title='Paid This Month' subtitle='Rent payments successfully collected'>
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          {paidThisMonth.length === 0 ? (
            <div className='p-8 text-center'>
              <CheckCircle2 className='w-8 h-8 text-gray-300 mx-auto mb-2' />
              <p className='text-sm text-gray-500'>No rent payments recorded as paid this month yet.</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {paidThisMonth.map((p) => (
                <div key={p.id} className='px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors'>
                  <div className='flex items-center gap-2.5'>
                    <div className='h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                      {(p.tenant?.name || '?')[0].toUpperCase()}
                    </div>
                    <div className='min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>{p.tenant?.name || 'Tenant'}</p>
                      <p className='text-[10px] text-gray-500 truncate'>{formatUnitLabel(p)}</p>
                    </div>
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-xs font-bold text-emerald-600'>{formatCurrency(Number(p.amount))}</p>
                    <p className='text-[10px] text-gray-400'>Due {new Date(p.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Late This Month */}
      <Section title='Late This Month' subtitle='Overdue rent payments requiring attention'>
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          {lateThisMonth.length === 0 ? (
            <div className='p-8 text-center'>
              <CheckCircle2 className='w-8 h-8 text-gray-300 mx-auto mb-2' />
              <p className='text-sm text-gray-500'>No tenants marked late so far this month.</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {lateThisMonth.map((p) => {
                const rent = Number(p.lease.rentAmount);
                const amt = Number(p.amount);
                const amountOwed = rent - (Number.isNaN(amt) ? 0 : amt);
                return (
                  <div key={p.id} className='px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors'>
                    <div className='flex items-center gap-2.5'>
                      <div className='h-8 w-8 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                        {(p.tenant?.name || '?')[0].toUpperCase()}
                      </div>
                      <div className='min-w-0'>
                        <p className='text-xs font-semibold text-gray-800 truncate'>{p.tenant?.name || 'Tenant'}</p>
                        <p className='text-[10px] text-gray-500 truncate'>{formatUnitLabel(p)}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                      <div className='text-right'>
                        <p className='text-xs font-bold text-red-600'>{formatCurrency(amountOwed > 0 ? amountOwed : rent)}</p>
                        <p className='text-[10px] text-gray-400'>Due {new Date(p.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      <span className='text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 uppercase'>{p.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* Partial Payments */}
      {partialPayments.length > 0 && (
        <Section title='Partial Payments' subtitle='Payments less than the full rent amount'>
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
            <div className='divide-y divide-gray-50'>
              {partialPayments.map((p) => {
                const rent = Number(p.lease.rentAmount);
                const amt = Number(p.amount);
                const remaining = rent - amt;
                return (
                  <div key={p.id} className='px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors'>
                    <div className='flex items-center gap-2.5'>
                      <div className='h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                        {(p.tenant?.name || '?')[0].toUpperCase()}
                      </div>
                      <div className='min-w-0'>
                        <p className='text-xs font-semibold text-gray-800 truncate'>{p.tenant?.name || 'Tenant'}</p>
                        <p className='text-[10px] text-gray-500 truncate'>{formatUnitLabel(p)}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3 shrink-0'>
                      <div className='text-right'>
                        <p className='text-[10px] text-gray-400'>Paid</p>
                        <p className='text-xs font-semibold text-emerald-600'>{formatCurrency(amt)}</p>
                      </div>
                      <div className='text-right'>
                        <p className='text-[10px] text-gray-400'>Remaining</p>
                        <p className='text-xs font-bold text-amber-600'>{formatCurrency(remaining)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      )}
    </main>
  );
}

// --- Sub-components ---

function KPICard({ title, value, subtitle, icon: Icon, gradient }: {
  title: string; value: string; subtitle: string; icon: React.ElementType; gradient: string;
}) {
  return (
    <div className='relative rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm overflow-hidden'>
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
      <div className='flex items-start justify-between'>
        <div className='space-y-1'>
          <p className='text-[10px] sm:text-xs text-gray-500 font-medium'>{title}</p>
          <p className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900'>{value}</p>
          <p className='text-[10px] text-gray-400'>{subtitle}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
          <Icon className='h-4 w-4' />
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className='space-y-3'>
      <div>
        <h2 className='text-sm font-bold text-gray-800'>{title}</h2>
        <p className='text-[11px] text-gray-500'>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between py-1 px-2 rounded bg-gray-50'>
      <span className='text-gray-500'>{label}</span>
      <span className='font-semibold text-gray-800'>{value}</span>
    </div>
  );
}
