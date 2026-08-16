'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import LeaseSigningModal from '@/components/lease-signing-modal';

export default function SignButton({ leaseId }: { leaseId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [signingToken, setSigningToken] = useState('');

  const handleClick = async () => {
    try {
      setIsLoading(true);
      setError('');

      const res = await fetch(`/api/leases/${leaseId}/sign-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'tenant' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to start signing.');
        return;
      }

      const data = (await res.json()) as { url?: string; token?: string };
      const token = data.token || '';
      if (!token) {
        setError('Signing link missing.');
        return;
      }

      setSigningToken(token);
      setModalOpen(true);
    } catch (err) {
      setError('Something went wrong starting signing.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-2'>
      {error && <p className='text-xs text-destructive'>{error}</p>}
      <Button
        type='button'
        onClick={handleClick}
        disabled={isLoading}
        className='rounded-full'
      >
        {isLoading ? 'Opening…' : 'Sign lease electronically'}
      </Button>
      
      {signingToken && (
        <LeaseSigningModal 
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          token={signingToken}
        />
      )}
    </div>
  );
}
