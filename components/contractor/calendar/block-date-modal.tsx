'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { XCircle } from 'lucide-react';

interface BlockDateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractorId: string;
  onSuccess?: () => void;
}

export default function BlockDateModal({
  open,
  onOpenChange,
  contractorId,
  onSuccess,
}: BlockDateModalProps) {
  const { toast } = useToast();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBlockDates = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: 'No dates selected',
        description: 'Please select at least one date to block',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Block each selected date and capture failures
      const results = await Promise.allSettled(
        selectedDates.map((date) =>
          fetch('/api/contractor/calendar/block-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractorId,
              date: date.toISOString(),
              reason,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || `Failed to block ${date.toDateString()}`);
            }
            return res;
          })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');

      if (failed.length === selectedDates.length) {
        const firstError = (failed[0] as PromiseRejectedResult).reason;
        toast({
          title: 'Failed to block dates',
          description: firstError instanceof Error ? firstError.message : 'Unknown error',
          variant: 'destructive',
        });
        return;
      }

      if (failed.length > 0) {
        toast({
          title: `Blocked ${selectedDates.length - failed.length} of ${selectedDates.length} dates`,
          description: `${failed.length} failed — please try again`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Dates blocked successfully',
          description: `${selectedDates.length} date(s) have been blocked`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
      setSelectedDates([]);
      setReason('');
    } catch (error) {
      toast({
        title: 'Failed to block dates',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Block Dates
          </DialogTitle>
          <DialogDescription>
            Select dates you want to block from booking. These dates will not be available for customers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Dates to Block</Label>
            <div className="mt-2 flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
            {selectedDates.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedDates.length} date(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Vacation, Personal time off, Equipment maintenance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBlockDates} disabled={loading || selectedDates.length === 0}>
            {loading ? 'Blocking...' : `Block ${selectedDates.length} Date(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
