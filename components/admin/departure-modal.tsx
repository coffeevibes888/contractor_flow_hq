'use client';

import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserMinus, Calendar } from 'lucide-react';
import type { DepartureModalProps } from '@/types/tenant-lifecycle';

export function DepartureModal({
  isOpen,
  onClose,
  lease,
  onSuccess,
}: DepartureModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!departureDate) {
      toast({
        variant: 'destructive',
        description: 'Please select a departure date.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/departures/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: lease.id,
          departureType: 'voluntary',
          departureDate,
          notes: notes || undefined,
          initiateOffboarding: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to record departure');
      }

      toast({
        description: 'Tenant departure recorded. Offboarding process initiated.',
      });

      // Reset form
      setDepartureDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        description: error?.message || 'Failed to record departure',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Record Tenant Departure"
      description={`Record that ${lease.tenant.name} has left the property`}
    >
      <div className="space-y-4 py-4">
        {/* Tenant Info */}
        <div className="rounded-lg bg-slate-800/60 border border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <UserMinus className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-white">{lease.tenant.name}</p>
              <p className="text-xs text-slate-400">{lease.tenant.email}</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-300">
          <p>
            Recording a departure will initiate the offboarding process, including:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>Terminate the lease</li>
            <li>Create tenant history record</li>
            <li>Generate turnover checklist</li>
            <li>Cancel pending payments</li>
          </ul>
        </div>

        {/* Departure Date */}
        <div className="space-y-2">
          <Label className="text-slate-200">Departure Date *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="bg-slate-800 border-white/10 text-white pl-10"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-slate-200">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about the departure..."
            className="bg-slate-800 border-white/10 text-white min-h-[80px]"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/20 text-white hover:bg-slate-800"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !departureDate}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Record Departure
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
