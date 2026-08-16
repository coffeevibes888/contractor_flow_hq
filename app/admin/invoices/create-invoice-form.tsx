'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createTenantInvoice, getPropertyTenants } from '@/lib/actions/invoice.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Property {
  id: string;
  name: string;
  units: {
    id: string;
    name: string;
    leases: {
      id: string;
      tenant: { id: string; name: string; email: string } | null;
    }[];
  }[];
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  unitName: string;
  leaseId: string;
}

interface LineItem {
  description: string;
  amount: string;
}

interface CreateInvoiceFormProps {
  properties: Property[];
  preselectedPropertyId?: string;
  preselectedTenantId?: string;
  preselectedLeaseId?: string;
}

const COMMON_CHARGES = [
  'Late Fee',
  'Repair Charge',
  'Pet Violation',
  'Cleaning Fee',
  'Parking Fee',
  'Utility Reimbursement',
  'HOA Violation',
  'Key Replacement',
  'Lease Violation',
  'Other',
];

export default function CreateInvoiceForm({
  properties,
  preselectedPropertyId,
  preselectedTenantId,
  preselectedLeaseId,
}: CreateInvoiceFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(preselectedPropertyId || '');
  const [selectedTenantId, setSelectedTenantId] = useState(preselectedTenantId || '');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [sendOnCreate, setSendOnCreate] = useState(true);
  const [useLineItems, setUseLineItems] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', amount: '' }]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!selectedPropertyId) { setTenants([]); return; }
    const load = async () => {
      setLoadingTenants(true);
      const result = await getPropertyTenants(selectedPropertyId);
      if (result.success) {
        setTenants(result.tenants);
        if (preselectedTenantId && result.tenants.some((t: Tenant) => t.id === preselectedTenantId)) {
          setSelectedTenantId(preselectedTenantId);
        }
      }
      setLoadingTenants(false);
    };
    load();
  }, [selectedPropertyId, preselectedTenantId]);

  useEffect(() => {
    if (preselectedPropertyId) setSelectedPropertyId(preselectedPropertyId);
  }, [preselectedPropertyId]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  useEffect(() => {
    if (selectedTenant && !useCustomEmail) setCustomEmail(selectedTenant.email);
  }, [selectedTenant, useCustomEmail]);

  const lineItemTotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const addLineItem = () => setLineItems((p) => [...p, { description: '', amount: '' }]);
  const removeLineItem = (i: number) => setLineItems((p) => p.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, field: keyof LineItem, value: string) =>
    setLineItems((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const tenant = tenants.find((t) => t.id === selectedTenantId);
    const amount = useLineItems ? lineItemTotal : Number(formData.get('amount'));
    const lineItemSummary = useLineItems
      ? lineItems.filter((li) => li.description && li.amount)
          .map((li) => `${li.description}: $${parseFloat(li.amount).toFixed(2)}`).join('\n')
      : undefined;
    const description = lineItemSummary
      ? `${formData.get('description') || ''}\n\nLine items:\n${lineItemSummary}`.trim()
      : (formData.get('description') as string) || undefined;

    const data = {
      propertyId: selectedPropertyId,
      tenantId: selectedTenantId,
      leaseId: tenant?.leaseId || preselectedLeaseId || undefined,
      amount,
      reason: reason || (formData.get('reason') as string),
      description,
      dueDate: new Date(formData.get('dueDate') as string).toISOString(),
    };

    const result = await createTenantInvoice(data);
    if (result.success) {
      if (sendOnCreate && result.invoiceId) {
        const emailTo = useCustomEmail ? customEmail : selectedTenant?.email;
        if (emailTo) {
          const { sendInvoiceByEmail } = await import('@/lib/actions/invoice.actions');
          await sendInvoiceByEmail(result.invoiceId, emailTo);
        }
      }
      toast({ description: sendOnCreate ? 'Invoice created and emailed!' : 'Invoice created successfully' });
      (e.target as HTMLFormElement).reset();
      setSelectedPropertyId('');
      setSelectedTenantId('');
      setTenants([]);
      setReason('');
      setLineItems([{ description: '', amount: '' }]);
      setCustomEmail('');
      router.refresh();
    } else {
      toast({ variant: 'destructive', description: result.message });
    }
    setIsSubmitting(false);
  };

  const selectClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all';
  const labelClass = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1';

  return (
    <form onSubmit={handleSubmit} className='space-y-4 max-w-2xl'>

      {/* Property + Tenant row */}
      <div className='grid sm:grid-cols-2 gap-4'>
        <div>
          <label className={labelClass}>Property</label>
          <select
            name='propertyId'
            required
            value={selectedPropertyId}
            onChange={(e) => { setSelectedPropertyId(e.target.value); setSelectedTenantId(''); }}
            className={selectClass}
          >
            <option value=''>Select a property…</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>{prop.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Tenant</label>
          <select
            name='tenantId'
            required
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            disabled={!selectedPropertyId || loadingTenants}
            className={`${selectClass} disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
          >
            <option value=''>
              {loadingTenants ? 'Loading…' : !selectedPropertyId ? 'Select property first' : tenants.length === 0 ? 'No active tenants' : 'Select a tenant…'}
            </option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.unitName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Charge type chips */}
      <div>
        <label className={labelClass}>Charge Type</label>
        <div className='flex flex-wrap gap-1.5'>
          {COMMON_CHARGES.map((charge) => (
            <button
              key={charge}
              type='button'
              onClick={() => setReason(charge)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-colors ${
                reason === charge
                  ? 'bg-cyan-600 border-cyan-600 text-white shadow-cyan-200'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-cyan-400 hover:text-cyan-700 hover:bg-cyan-50'
              }`}
            >
              {charge}
            </button>
          ))}
        </div>
        {(!COMMON_CHARGES.includes(reason) || reason === 'Other') && (
          <Input
            type='text'
            name='reason'
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Describe the charge…'
            className='mt-2 border-gray-300 shadow-sm focus:ring-cyan-500/30 focus:border-cyan-500'
          />
        )}
        {COMMON_CHARGES.includes(reason) && reason !== 'Other' && (
          <input type='hidden' name='reason' value={reason} />
        )}
      </div>

      {/* Amount */}
      <div>
        <div className='flex items-center justify-between mb-1'>
          <label className={labelClass} style={{ marginBottom: 0 }}>Amount</label>
          <button
            type='button'
            onClick={() => setUseLineItems((v) => !v)}
            className='text-xs text-cyan-600 hover:text-cyan-700 font-medium transition-colors'
          >
            {useLineItems ? '− Single amount' : '+ Add line items'}
          </button>
        </div>

        {useLineItems ? (
          <div className='rounded-lg border border-gray-300 bg-white/70 p-3 space-y-2 shadow-sm'>
            {lineItems.map((item, i) => (
              <div key={i} className='flex gap-2 items-center'>
                <input
                  type='text'
                  placeholder='Description'
                  value={item.description}
                  onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                  className='flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500'
                />
                <input
                  type='number'
                  placeholder='0.00'
                  min='0'
                  step='0.01'
                  value={item.amount}
                  onChange={(e) => updateLineItem(i, 'amount', e.target.value)}
                  className='w-24 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500'
                />
                {lineItems.length > 1 && (
                  <button type='button' onClick={() => removeLineItem(i)} className='text-gray-400 hover:text-red-500 text-lg leading-none transition-colors'>×</button>
                )}
              </div>
            ))}
            <div className='flex items-center justify-between pt-1'>
              <button type='button' onClick={addLineItem} className='text-xs text-cyan-600 hover:text-cyan-700 font-medium'>
                + Add row
              </button>
              <span className='text-sm font-semibold text-gray-900'>Total: ${lineItemTotal.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <Input
            type='number'
            name='amount'
            required
            min='0.01'
            step='0.01'
            placeholder='0.00'
            className='border-gray-300 shadow-sm focus:ring-cyan-500/30 focus:border-cyan-500'
          />
        )}
      </div>

      {/* Due Date + Notes row */}
      <div className='grid sm:grid-cols-2 gap-4'>
        <div>
          <label className={labelClass}>Due Date</label>
          <Input
            type='date'
            name='dueDate'
            required
            min={new Date().toISOString().split('T')[0]}
            className='border-gray-300 shadow-sm focus:ring-cyan-500/30 focus:border-cyan-500 text-gray-900'
          />
        </div>
        <div>
          <label className={labelClass}>Notes <span className='normal-case font-normal text-gray-400'>(optional)</span></label>
          <Textarea
            name='description'
            placeholder='Additional details…'
            className='resize-none border-gray-300 shadow-sm focus:ring-cyan-500/30 focus:border-cyan-500 text-gray-900 placeholder:text-gray-400'
            rows={2}
          />
        </div>
      </div>

      {/* Email recipient */}
      <div className='rounded-lg border border-gray-300 bg-white/80 p-3 space-y-2 shadow-sm'>
        <div className='flex items-center justify-between'>
          <p className={labelClass} style={{ marginBottom: 0 }}>Email Recipient</p>
          <button
            type='button'
            onClick={() => { setUseCustomEmail((v) => !v); if (!useCustomEmail) setCustomEmail(''); }}
            className='text-xs text-cyan-600 hover:text-cyan-700 font-medium transition-colors'
          >
            {useCustomEmail ? 'Use tenant email' : 'Send to different email'}
          </button>
        </div>
        <Input
          type='email'
          value={useCustomEmail ? customEmail : (selectedTenant?.email || '')}
          onChange={(e) => { if (useCustomEmail) setCustomEmail(e.target.value); }}
          readOnly={!useCustomEmail}
          placeholder={selectedTenantId ? '' : 'Select a tenant first'}
          className='border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm read-only:bg-gray-50 read-only:text-gray-500 focus:ring-cyan-500/30 focus:border-cyan-500'
        />
      </div>

      {/* Send on create toggle */}
      <label className='flex items-center gap-3 cursor-pointer'>
        <div
          onClick={() => setSendOnCreate((v) => !v)}
          className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${sendOnCreate ? 'bg-cyan-500' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendOnCreate ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
        <span className='text-sm text-gray-600 select-none'>Email invoice immediately after creating</span>
      </label>

      <Button
        type='submit'
        disabled={isSubmitting || !selectedPropertyId || !selectedTenantId || !reason}
        className='bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 px-6'
      >
        {isSubmitting ? 'Creating…' : 'Create Invoice'}
      </Button>
    </form>
  );
}
