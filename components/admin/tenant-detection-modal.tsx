'use client';

import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, UserCheck, Home } from 'lucide-react';
import type { TenantDetectionModalProps, DepartureType } from '@/types/tenant-lifecycle';

const DEPARTURE_REASONS: { value: DepartureType; label: string }[] = [
  { value: 'voluntary', label: 'Tenant Left Voluntarily' },
  { value: 'eviction', label: 'Tenant Was Evicted' },
  { value: 'lease_end', label: 'Lease Ended' },
  { value: 'mutual_agreement', label: 'Mutual Agreement' },
];

export function TenantDetectionModal({
  isOpen,
  onClose,
  tenant,
  unit,
  onConfirmDeparture,
  onConfirmTermination,
}: TenantDetectionModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'detect' | 'reason' | 'confirm'>('detect');
  const [departed, setDeparted] = useState<boolean | null>(null);
  const [departureReason, setDepartureReason] = useState<DepartureType>('voluntary');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDepartureResponse = (hasDeparted: boolean) => {
    setDeparted(hasDeparted);
    if (hasDeparted) {
      setStep('reason');
    } else {
      // Tenant hasn't left - close modal and don't change availability
      toast({
        description: 'Unit availability not changed. Tenant is still in the unit.',
      });
      onConfirmDeparture(false);
      onClose();
    }
  };

  const handleReasonSelected = () => {
    setStep('confirm');
  };

  const handleConfirmTermination = async (terminate: boolean) => {
    setIsSubmitting(true);
    try {
      onConfirmTermination(terminate);
      if (terminate) {
        toast({
          description: 'Lease will be terminated and unit marked as available.',
        });
      } else {
        toast({
          description: 'Departure recorded. Lease remains active.',
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('detect');
    setDeparted(null);
    setDepartureReason('voluntary');
    onClose();
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={resetAndClose}
      title="Tenant Detected"
      description="This unit has an active tenant"
    >
      <div className="space-y-4 py-4">
        {/* Tenant Info */}
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-white">{tenant.tenantName}</p>
              <p className="text-sm text-slate-400">{tenant.unitName}</p>
              <p className="text-xs text-amber-300 mt-1">Active lease detected</p>
            </div>
          </div>
        </div>

        {/* Step 1: Did tenant leave? */}
        {step === 'detect' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              There is an active tenant in this unit. Did <strong className="text-white">{tenant.tenantName}</strong> leave or get evicted?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleDepartureResponse(true)}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Yes, They Left
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDepartureResponse(false)}
                className="flex-1 border-white/20 text-white hover:bg-slate-800"
              >
                No, Still Here
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select reason */}
        {step === 'reason' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              How did the tenant leave?
            </p>
            <div className="space-y-2">
              <Label className="text-slate-200">Departure Reason</Label>
              <Select value={departureReason} onValueChange={(v) => setDepartureReason(v as DepartureType)}>
                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {DEPARTURE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value} className="text-white">
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('detect')}
                className="flex-1 border-white/20 text-white hover:bg-slate-800"
              >
                Back
              </Button>
              <Button
                onClick={handleReasonSelected}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm termination */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Do you want to terminate the lease and mark the unit as available?
            </p>
            
            <div className="rounded-lg bg-slate-800/60 border border-white/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Home className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">Unit:</span>
                <span className="text-white">{tenant.unitName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">Reason:</span>
                <span className="text-white">
                  {DEPARTURE_REASONS.find((r) => r.value === departureReason)?.label}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-300">
              <p>Terminating the lease will:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>End the current lease agreement</li>
                <li>Create a tenant history record</li>
                <li>Generate a turnover checklist</li>
                <li>Mark the unit as available for listing</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('reason')}
                className="flex-1 border-white/20 text-white hover:bg-slate-800"
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={() => handleConfirmTermination(true)}
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Yes, Terminate Lease'
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => handleConfirmTermination(false)}
              className="w-full text-slate-400 hover:text-white"
              disabled={isSubmitting}
            >
              No, keep lease active
            </Button>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
