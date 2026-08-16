'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DomainPurchaseFormProps {
  domain: string;
  price: number;
  currency: string;
  onCancel: () => void;
}

export default function DomainPurchaseForm({ domain, price, currency, onCancel }: DomainPurchaseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nameFirst: '',
    nameLast: '',
    email: '',
    phone: '',
    address1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    years: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/domains/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            domain,
            years: formData.years,
            contactInfo: {
              nameFirst: formData.nameFirst,
              nameLast: formData.nameLast,
              email: formData.email,
              phone: formData.phone,
              address1: formData.address1,
              city: formData.city,
              state: formData.state,
              zip: formData.zip,
              country: formData.country,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to purchase domain');
        }

        // Refresh the page to show the new domain
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to purchase domain');
      }
    });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4'>
        <p className='text-sm font-medium text-emerald-900'>Purchase Domain</p>
        <p className='text-lg font-semibold text-emerald-800 mt-1'>{domain}</p>
        <p className='text-sm text-emerald-700 mt-2'>
          {formatPrice(price * formData.years, currency)} for {formData.years} year{formData.years > 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800'>{error}</div>
      )}

      <div className='grid gap-4 sm:grid-cols-2'>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>First Name</label>
          <input
            type='text'
            required
            value={formData.nameFirst}
            onChange={(e) => setFormData({ ...formData, nameFirst: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>Last Name</label>
          <input
            type='text'
            required
            value={formData.nameLast}
            onChange={(e) => setFormData({ ...formData, nameLast: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>Email</label>
          <input
            type='email'
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>Phone</label>
          <input
            type='tel'
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div className='sm:col-span-2'>
          <label className='block text-sm font-medium text-slate-700 mb-1'>Address</label>
          <input
            type='text'
            required
            value={formData.address1}
            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>City</label>
          <input
            type='text'
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>State</label>
          <input
            type='text'
            required
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>ZIP Code</label>
          <input
            type='text'
            required
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>Country</label>
          <select
            required
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          >
            <option value='US'>United States</option>
            <option value='CA'>Canada</option>
            <option value='GB'>United Kingdom</option>
            <option value='AU'>Australia</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-slate-700 mb-1'>Years</label>
          <select
            value={formData.years}
            onChange={(e) => setFormData({ ...formData, years: parseInt(e.target.value) })}
            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
          >
            <option value={1}>1 Year</option>
            <option value={2}>2 Years</option>
            <option value={3}>3 Years</option>
            <option value={5}>5 Years</option>
            <option value={10}>10 Years</option>
          </select>
        </div>
      </div>

      <div className='flex gap-3'>
        <Button
          type='submit'
          disabled={isPending}
          className='flex-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50'
        >
          {isPending ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin mr-2' />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className='h-4 w-4 mr-2' />
              Purchase Domain
            </>
          )}
        </Button>
        <Button type='button' onClick={onCancel} variant='outline' className='flex-1'>
          Cancel
        </Button>
      </div>
    </form>
  );
}

