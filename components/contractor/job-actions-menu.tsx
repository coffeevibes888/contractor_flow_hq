'use client';

/**
 * JobActionsMenu
 *
 * Header actions for a job: Generate Invoice, Archive, Delete. Wraps the
 * destructive actions in a confirmation dialog and calls the relevant APIs.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical, FileText, Archive, Trash2, Receipt, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  jobId: string;
  jobStatus: string;
  hasCustomer: boolean;
}

export function JobActionsMenu({ jobId, jobStatus, hasCustomer }: Props) {
  const router = useRouter();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | 'archive' | 'delete'>(null);
  const [working, setWorking] = useState(false);

  // Invoice options
  const [taxRate, setTaxRate] = useState('');
  const [dueInDays, setDueInDays] = useState('30');
  const [includeLabor, setIncludeLabor] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeChangeOrders, setIncludeChangeOrders] = useState(true);

  const isArchived = jobStatus === 'archived';

  const handleGenerateInvoice = async () => {
    setWorking(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/generate-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRate: taxRate ? Number(taxRate) : 0,
          dueInDays: Number(dueInDays || 30),
          includeLabor,
          includeExpenses,
          includeChangeOrders,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Invoice ${data.invoice?.invoiceNumber ?? ''} created`);
        setInvoiceOpen(false);
        router.push('/contractor-dashboard/invoices');
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to generate invoice');
      }
    } finally {
      setWorking(false);
    }
  };

  const handleArchive = async () => {
    setWorking(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isArchived ? 'completed' : 'archived' }),
      });
      if (res.ok) {
        toast.success(isArchived ? 'Job restored' : 'Job archived');
        setConfirm(null);
        router.push('/contractor-dashboard/jobs');
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to archive job');
      }
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    setWorking(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Job deleted');
        setConfirm(null);
        router.push('/contractor-dashboard/jobs');
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to delete job');
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='bg-white/20 hover:bg-white/30 text-gray-900 border-white/40'
          >
            <MoreVertical className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-52'>
          <DropdownMenuItem onClick={() => setInvoiceOpen(true)}>
            <Receipt className='h-4 w-4 mr-2' />
            Generate Invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirm('archive')}>
            <Archive className='h-4 w-4 mr-2' />
            {isArchived ? 'Restore Job' : 'Archive Job'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirm('delete')}
            className='text-red-600 focus:text-red-600'
          >
            <Trash2 className='h-4 w-4 mr-2' />
            Delete Job
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Generate invoice dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <FileText className='h-5 w-5 text-violet-600' />
              Generate Invoice
            </DialogTitle>
            <DialogDescription>
              Build a draft invoice from this job&apos;s billable hours, expenses, and approved
              change orders.
            </DialogDescription>
          </DialogHeader>

          {!hasCustomer && (
            <div className='rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700'>
              This job has no customer attached. Add a customer in Edit Job before invoicing.
            </div>
          )}

          <div className='space-y-3 py-1'>
            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input type='checkbox' checked={includeLabor}
                onChange={(e) => setIncludeLabor(e.target.checked)}
                className='rounded text-violet-600 focus:ring-violet-500' />
              Include billable labor (from time entries)
            </label>
            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input type='checkbox' checked={includeExpenses}
                onChange={(e) => setIncludeExpenses(e.target.checked)}
                className='rounded text-violet-600 focus:ring-violet-500' />
              Include billable expenses
            </label>
            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input type='checkbox' checked={includeChangeOrders}
                onChange={(e) => setIncludeChangeOrders(e.target.checked)}
                className='rounded text-violet-600 focus:ring-violet-500' />
              Include approved change orders
            </label>
            <div className='grid grid-cols-2 gap-3 pt-1'>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Tax Rate (%)</label>
                <input type='number' min='0' step='0.01' value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)} placeholder='0'
                  className='w-full px-3 py-2 rounded-lg border border-gray-300 text-sm' />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 mb-1'>Due in (days)</label>
                <input type='number' min='1' value={dueInDays}
                  onChange={(e) => setDueInDays(e.target.value)}
                  className='w-full px-3 py-2 rounded-lg border border-gray-300 text-sm' />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setInvoiceOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={handleGenerateInvoice} disabled={working || !hasCustomer}
              className='bg-violet-600 hover:bg-violet-700 text-white'>
              {working && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              Create Draft Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive / Delete confirmation */}
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'delete' ? 'Delete this job?' : isArchived ? 'Restore this job?' : 'Archive this job?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'delete'
                ? 'This permanently deletes the job and all of its time entries, expenses, notes, photos, change orders, and checklist items. This cannot be undone.'
                : isArchived
                ? 'This job will be restored to your active jobs list.'
                : 'Archived jobs are hidden from your active jobs list but kept for your records. You can restore them anytime.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirm === 'delete') handleDelete();
                else handleArchive();
              }}
              disabled={working}
              className={confirm === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}
            >
              {working && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              {confirm === 'delete' ? 'Delete' : isArchived ? 'Restore' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
