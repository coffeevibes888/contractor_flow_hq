'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { FileSignature, Loader2 } from 'lucide-react';

interface LandlordSignButtonProps {
  leaseId: string;
  variant?: 'default' | 'compact';
}

export default function LandlordSignButton({ leaseId, variant = 'default' }: LandlordSignButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSign = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leases/${leaseId}/sign-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'landlord' }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Failed to initiate signing');
        return;
      }

      const data = await res.json();
      const token = data.token || '';
      if (!token) {
        alert('Signing link missing');
        return;
      }
      
      // Navigate to the signing page
      router.push(`/sign/${token}`);
    } catch (error) {
      console.error('Sign error:', error);
      alert('An error occurred while initiating signing');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <Button
        onClick={handleSign}
        disabled={loading}
        size="sm"
        className='bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <FileSignature className="w-4 h-4 mr-2" />
            Sign Lease
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleSign}
      disabled={loading}
      className='bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <FileSignature className="w-4 h-4 mr-2" />
          Sign Lease Electronically
        </>
      )}
    </Button>
  );
}
