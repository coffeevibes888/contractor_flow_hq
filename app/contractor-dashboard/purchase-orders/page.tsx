import { Metadata } from 'next';
import { requireContractor } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Plus, ShoppingCart, Truck, DollarSign, Package, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Purchase Orders | Contractor Portal',
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Draft' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Sent' },
  acknowledged: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Acknowledged' },
  partially_received: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'Partial' },
  received: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Received' },
  canceled: { bg: 'bg-red-50', text: 'text-red-600', label: 'Canceled' },
};

export default async function PurchaseOrdersPage() {
  const session = await requireContractor();
  const { id: userId } = session.user;

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!contractorProfile) {
    return (
      <div className='w-full space-y-5'>
        <h1 className='text-xl font-bold text-black'>Purchase Orders</h1>
        <p className='text-sm text-gray-500'>Contractor profile not found.</p>
      </div>
    );
  }

  const purchaseOrders = await prisma.$queryRaw`
    SELECT po.*, v.name as vendorName 
    FROM "ContractorPurchaseOrder" po
    LEFT JOIN "ContractorVendor" v ON po."vendorId" = v.id
    WHERE po."contractorId" = ${contractorProfile.id}
    ORDER BY po."orderDate" DESC
  `;

  const pos = Array.isArray(purchaseOrders) ? purchaseOrders : [];

  const draftCount = pos.filter((p: any) => p.status === 'draft').length;
  const pendingCount = pos.filter((p: any) => ['sent', 'acknowledged'].includes(p.status)).length;
  const receivedCount = pos.filter((p: any) => p.status === 'received').length;
  const totalValue = pos.reduce((acc: number, p: any) => acc + Number(p.total || 0), 0);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Purchase Orders</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Track material orders and deliveries</p>
        </div>
        <Link href='/contractor-dashboard/purchase-orders/new'>
          <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start'>
            <Plus className='h-4 w-4 mr-2' /> Create Purchase Order
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          { label: 'Draft POs', value: String(draftCount), icon: FileText, gradient: 'from-gray-400 to-slate-400' },
          { label: 'Pending Delivery', value: String(pendingCount), icon: Truck, gradient: 'from-amber-400 to-orange-400' },
          { label: 'Received', value: String(receivedCount), icon: Package, gradient: 'from-emerald-400 to-cyan-400' },
          { label: 'Total Value', value: formatCurrency(totalValue), icon: DollarSign, gradient: 'from-blue-400 to-indigo-400' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className='relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden'>
            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl ${gradient} opacity-10 rounded-bl-full`} />
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-[10px] text-gray-500 font-medium'>{label}</p>
                <p className='text-xl font-bold text-gray-900 mt-0.5'>{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                <Icon className='h-4 w-4' />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PO List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>All Purchase Orders</h3>
          <span className='text-xs text-gray-400'>{pos.length} total</span>
        </div>

        {pos.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center'>
              <ShoppingCart className='h-7 w-7 text-gray-300' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>No purchase orders yet</h3>
            <p className='text-sm text-gray-500 mb-4'>Create purchase orders to track material orders from vendors.</p>
            <Link href='/contractor-dashboard/purchase-orders/new'>
              <Button className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' /> Create First PO
              </Button>
            </Link>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {pos.map((po: any) => {
              const sc = statusConfig[po.status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: po.status };
              return (
                <Link key={po.id} href={`/contractor-dashboard/purchase-orders/${po.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'>
                  <div className='h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0'>
                    <FileText className='h-4 w-4 text-blue-500' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <p className='text-xs font-semibold text-gray-800'>{po.poNumber}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} shrink-0`}>{sc.label}</span>
                    </div>
                    <p className='text-[10px] text-gray-500'>{po.vendorName || 'No vendor'} · {new Date(po.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-xs font-bold text-gray-800'>{formatCurrency(po.total)}</p>
                  </div>
                  <ChevronRight className='h-4 w-4 text-gray-300 shrink-0' />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
