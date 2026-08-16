'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Clock, FileText, Briefcase, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

export function DashboardQuickActions() {
  const router = useRouter();
  const [isClockDialogOpen, setIsClockDialogOpen] = useState(false);
  // Source-of-truth comes from the server: we ask the time/clock route
  // whether there's an open time entry on mount. Without this, the button
  // always rendered "Clock In" even when the user was already clocked in,
  // so the API rejected the duplicate clock_in and the toast read "Failed to
  // process clock action" — a classic Pattern 4 (silent error).
  const [isClockedIn, setIsClockedIn] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/contractor/time/clock', { method: 'GET' });
        if (!res.ok) {
          // GET may not exist or the user isn't an employee — treat as not
          // clocked in and let the POST tell us if we're wrong.
          if (!cancelled) setIsClockedIn(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) setIsClockedIn(Boolean(data?.clockedIn ?? data?.isClockedIn));
      } catch {
        if (!cancelled) setIsClockedIn(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleClockAction = async () => {
    setIsLoading(true);
    try {
      const action = isClockedIn ? 'clock_out' : 'clock_in';

      // Get location if available
      let location: { lat: number; lng: number } | null = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch {
          // Location not available — non-fatal
        }
      }

      const response = await fetch('/api/contractor/time/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, location }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to process clock action');
      }

      setIsClockedIn(!isClockedIn);
      toast({
        title: 'Success',
        description: data.message,
      });
      setIsClockDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process clock action',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
      {/* Browse Jobs — public marketplace listing */}
      <Button
        onClick={() => router.push('/contractors?view=jobs')}
        className='h-auto flex-col gap-2 p-4 bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-600 border border-black shadow-2xl'
      >
        <Briefcase className='h-6 w-6' />
        <span className='text-sm font-semibold'>Browse Jobs</span>
      </Button>

      {/* New Estimate — go straight to the estimates section instead of
          dropping the user on the leads list and hoping they figure out the
          quote builder is buried inside a lead modal. */}
      <Button
        onClick={() => router.push('/contractor-dashboard/estimates')}
        className='h-auto flex-col gap-2 p-4 bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-600 border border-black shadow-2xl'
      >
        <FileText className='h-6 w-6' />
        <span className='text-sm font-semibold'>New Estimate</span>
      </Button>

      {/* Clock In/Out */}
      <Dialog open={isClockDialogOpen} onOpenChange={setIsClockDialogOpen}>
        <DialogTrigger asChild>
          <Button
            disabled={isClockedIn === null}
            className='h-auto flex-col gap-2 p-4 bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-600 border border-black shadow-2xl'
          >
            <Clock className='h-6 w-6' />
            <span className='text-sm font-semibold'>
              {isClockedIn === null ? 'Loading...' : isClockedIn ? 'Clock Out' : 'Clock In'}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isClockedIn ? 'Clock Out' : 'Clock In'}</DialogTitle>
            <DialogDescription>
              {isClockedIn
                ? 'End your work session and log your hours'
                : 'Start tracking your work time'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              {isClockedIn
                ? 'Your time will be automatically calculated and saved.'
                : 'Location will be captured if available for GPS tracking.'}
            </p>
            <Button
              onClick={handleClockAction}
              disabled={isLoading || isClockedIn === null}
              className='w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'
            >
              {isLoading
                ? 'Processing...'
                : isClockedIn
                ? 'Clock Out Now'
                : 'Clock In Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Leads — the leads pipeline */}
      <Button
        onClick={() => router.push('/contractor-dashboard/leads')}
        className='h-auto flex-col gap-2 p-4 bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-600 border border-black shadow-2xl'
      >
        <TrendingUp className='h-6 w-6' />
        <span className='text-sm font-semibold'>View Leads</span>
      </Button>
    </div>
  );
}
