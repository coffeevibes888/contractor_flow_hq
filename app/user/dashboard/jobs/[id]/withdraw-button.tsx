'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function WithdrawButton({ applicantId }: { applicantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!confirm('Withdraw this application? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/applicants/${applicantId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Application withdrawn');
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to withdraw');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handle}
      disabled={loading}
      className="text-red-600 border-red-200 hover:bg-red-50"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5 mr-1" />
      )}
      Withdraw Application
    </Button>
  );
}
