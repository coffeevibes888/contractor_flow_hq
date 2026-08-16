import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import { Plus, DollarSign, FileText, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InvoiceList } from '@/components/contractor/invoice-list';
import { formatCurrency } from '@/lib/utils';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Invoices | Contractor Dashboard',
};

export default async function InvoicesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  const invoices = await prisma.contractorInvoice.findMany({
    where: { contractorId: contractorProfile.id },
    orderBy: { createdAt: 'desc' },
  });

  const totalInvoices = invoices.length;
  const draftInvoices = invoices.filter((i) => i.status === 'draft').length;
  const sentInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'viewed').length;
  const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
  const overdueInvoices = invoices.filter(
    (i) =>
      (i.status === 'sent' || i.status === 'viewed' || i.status === 'partial') &&
      new Date(i.dueDate) < new Date()
  ).length;

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const paidAmount = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
  const outstandingAmount = invoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Invoices</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Create and manage customer invoices
          </p>
        </div>
        <Link href='/contractor-dashboard/invoices/new'>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold'>
            <Plus className='h-4 w-4 mr-2' />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <KPICard
          title='Total Invoiced'
          value={formatCurrency(totalAmount)}
          subtitle={`${totalInvoices} invoices`}
          icon={FileText}
          gradient='from-blue-400 to-indigo-400'
        />
        <KPICard
          title='Collected'
          value={formatCurrency(paidAmount)}
          subtitle={`${paidInvoices} paid`}
          icon={CheckCircle2}
          gradient='from-emerald-400 to-cyan-400'
        />
        <KPICard
          title='Outstanding'
          value={formatCurrency(outstandingAmount)}
          subtitle={`${sentInvoices} sent`}
          icon={DollarSign}
          gradient='from-amber-400 to-orange-400'
        />
        <KPICard
          title='Overdue'
          value={String(overdueInvoices)}
          subtitle={overdueInvoices > 0 ? 'Need attention' : 'All current'}
          icon={AlertTriangle}
          gradient='from-red-400 to-rose-400'
          alert={overdueInvoices > 0}
        />
      </div>

      {/* Summary Bar */}
      <div className='relative rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full' />
        <div className='relative p-4'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <SummaryItem label='Draft' value={String(draftInvoices)} />
            <SummaryItem label='Sent / Viewed' value={String(sentInvoices)} />
            <SummaryItem label='Paid' value={String(paidInvoices)} />
            <SummaryItem label='Overdue' value={String(overdueInvoices)} />
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueInvoices > 0 && (
        <div className='flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium'>
          <AlertTriangle className='h-3.5 w-3.5' />
          {overdueInvoices} overdue {overdueInvoices === 1 ? 'invoice' : 'invoices'} — follow up with your clients
          <ChevronRight className='h-3 w-3 ml-auto' />
        </div>
      )}

      {/* Invoice List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Invoices</h3>
          <span className='text-xs text-gray-400'>{totalInvoices} total</span>
        </div>
        <div className='p-4'>
          <InvoiceList invoices={invoices} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, gradient, alert }: {
  title: string; value: string; subtitle: string; icon: React.ElementType; gradient: string; alert?: boolean;
}) {
  return (
    <div className='relative rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm overflow-hidden'>
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
      {alert && <div className='absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse' />}
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-0.5'>
      <div className='text-[9px] sm:text-[10px] text-gray-500 font-semibold uppercase tracking-wide'>{label}</div>
      <div className='text-sm sm:text-base font-bold text-gray-800'>{value}</div>
    </div>
  );
}
