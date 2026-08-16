'use client';

import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileX, Calendar, AlertCircle } from 'lucide-react';
import type { DepartureType, TerminateLeaseModalProps } from '@/types/tenant-lifecycle';

const TERMINATION_REASONS: { value: DepartureType; label: string }[] = [
  { value: 'eviction', label: 'Eviction' },
  { value: 'voluntary', label: 'Voluntary Departure' },
  { value: 'lease_end', label: 'Lease End' },
  { value: 'mutual_agreement', label: 'Mutual Agreement' },
];

export function TerminateLeaseModal({
  isOpen,
  onClose,
  lease,
  onSuccess,
}: TerminateLeaseModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState<DepartureType>('mutual_agreement');
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [initiateOffboarding, setInitiateOffboarding] = useState(true);
  const [markUnitAvailable, setMarkUnitAvailable] = useState(false);
  const [confirmTermination, setConfirmTermination] = useState(false);

  const handleSubmit = async () => {
    if (!confirmTermination) {
      toast({
        variant: 'destructive',
        description: 'Please confirm that you want to terminate this lease.',
      });
      return;
    }

    if (!terminationDate) {
      toast({
        variant: 'destructive',
        description: 'Please select a termination date.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/leases/${lease.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          terminationDate,
          notes: notes || undefined,
          initiateOffboarding,
          markUnitAvailable,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to terminate lease');
      }

      toast({
        description: 'Lease terminated successfully.',
      });

      // Reset form
      setReason('mutual_agreement');
      setTerminationDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setInitiateOffboarding(true);
      setMarkUnitAvailable(false);
      setConfirmTermination(false);
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        description: error?.message || 'Failed to terminate lease',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Terminate Lease"
      description={`Terminate the lease for ${lease.tenant.name}`}
    >
      <div className="space-y-4 py-4">
        {/* Warning */}
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300">
              <p className="font-medium">This action cannot be undone</p>
              <p className="text-xs mt-1 text-red-300/80">
                Terminating a lease will end the tenancy and may trigger the offboarding process.
              </p>
            </div>
          </div>
        </div>

        {/* Tenant Info */}
        <div className="rounded-lg bg-slate-800/60 border border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
              <FileX className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="font-medium text-white">{lease.tenant.name}</p>
              <p className="text-xs text-slate-400">
                Lease started: {new Date(lease.startDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Termination Reason */}
        <div className="space-y-2">
          <Label className="text-slate-200">Termination Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as DepartureType)}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {TERMINATION_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-white">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Termination Date */}
        <div className="space-y-2">
          <Label className="text-slate-200">Termination Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
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
            placeholder="Any notes about the termination..."
            className="bg-slate-800 border-white/10 text-white min-h-[60px]"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="offboarding"
              checked={initiateOffboarding}
              onCheckedChange={(checked) => setInitiateOffboarding(checked as boolean)}
              className="border-white/20 data-[state=checked]:bg-emerald-600"
            />
            <Label htmlFor="offboarding" className="text-sm text-slate-300 cursor-pointer">
              Initiate full offboarding process
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="available"
              checked={markUnitAvailable}
              onCheckedChange={(checked) => setMarkUnitAvailable(checked as boolean)}
              className="border-white/20 data-[state=checked]:bg-emerald-600"
            />
            <Label htmlFor="available" className="text-sm text-slate-300 cursor-pointer">
              Mark unit as available for listing
            </Label>
          </div>
        </div>

        {/* Confirmation */}
        <div className="flex items-center space-x-2 pt-2 border-t border-white/10">
          <Checkbox
            id="confirm"
            checked={confirmTermination}
            onCheckedChange={(checked) => setConfirmTermination(checked as boolean)}
            className="border-red-500/50 data-[state=checked]:bg-red-600"
          />
          <Label htmlFor="confirm" className="text-sm text-slate-300 cursor-pointer">
            I confirm I want to terminate this lease
          </Label>
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
            disabled={isSubmitting || !confirmTermination}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Terminating...
              </>
            ) : (
              <>
                <FileX className="h-4 w-4 mr-2" />
                Terminate Lease
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
