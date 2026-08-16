'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function EvictionsClient() {
  const searchParams = useSearchParams();
  const prefillTenant = searchParams.get('tenant') || '';
  const prefillUnit = searchParams.get('unit') || '';

  const [tenantName, setTenantName] = useState(prefillTenant);
  const [unitAddress, setUnitAddress] = useState(prefillUnit);
  const [amountOwed, setAmountOwed] = useState('');
  const [reasons, setReasons] = useState('');

  const handlePrint = () => window.print();

  return (
    <div className='max-w-3xl mx-auto space-y-6 print:space-y-4'>
      <div className='print:hidden'>
        <h1 className='text-2xl font-bold text-gray-900'>Eviction Notice Drafting</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Fill in the details below to generate a notice template. This is not legal advice — consult a local attorney before serving.
        </p>
      </div>

      <div className='grid gap-4 print:hidden'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='text-sm font-medium text-gray-700'>Tenant Name</label>
            <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder='John Doe' />
          </div>
          <div>
            <label className='text-sm font-medium text-gray-700'>Unit / Address</label>
            <Input value={unitAddress} onChange={(e) => setUnitAddress(e.target.value)} placeholder='Unit 2B, 123 Main St' />
          </div>
        </div>
        <div>
          <label className='text-sm font-medium text-gray-700'>Amount Owed ($)</label>
          <Input type='number' value={amountOwed} onChange={(e) => setAmountOwed(e.target.value)} placeholder='0.00' />
        </div>
        <div>
          <label className='text-sm font-medium text-gray-700'>Reason(s) for Notice</label>
          <Textarea value={reasons} onChange={(e) => setReasons(e.target.value)} rows={4} placeholder='Non-payment of rent, lease violations, etc.' />
        </div>
        <Button onClick={handlePrint}>Print / Download Notice</Button>
      </div>

      {/* Printable notice */}
      <div className='border border-gray-300 rounded-xl p-8 bg-white space-y-4 text-sm leading-relaxed hidden print:block'>
        <h2 className='text-xl font-bold text-center uppercase'>Notice to Vacate</h2>
        <p>To: <strong>{tenantName || '[Tenant Name]'}</strong></p>
        <p>Premises: <strong>{unitAddress || '[Unit/Address]'}</strong></p>
        {amountOwed && <p>Total Amount Owed: <strong>${amountOwed}</strong></p>}
        <p>You are hereby notified to vacate the above premises within the time required by law for the following reason(s):</p>
        <p>{reasons || '[State reasons here]'}</p>
        <p className='mt-6 text-xs text-gray-500 italic'>
          Disclaimer: This document is a template only and does not constitute legal advice. Requirements vary by jurisdiction. Please consult a licensed attorney in your area before serving any eviction notice.
        </p>
      </div>
    </div>
  );
}
