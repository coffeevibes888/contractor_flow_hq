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
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Calendar } from 'lucide-react';
import type { NoticeType, EvictionNoticeModalProps } from '@/types/tenant-lifecycle';

const NOTICE_TYPES: { value: NoticeType; label: string; description: string }[] = [
  { value: '3-day', label: '3-Day Notice', description: 'Pay rent or quit' },
  { value: '7-day', label: '7-Day Notice', description: 'Cure violation or quit' },
  { value: '30-day', label: '30-Day Notice', description: 'Termination of tenancy' },
];

export function EvictionNoticeModal({
  isOpen,
  onClose,
  lease,
  propertyId,
  onSuccess,
}: EvictionNoticeModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticeType, setNoticeType] = useState<NoticeType>('3-day');
  const [reason, setReason] = useState('');
  const [amountOwed, setAmountOwed] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        description: 'Please provide a reason for the eviction notice.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/evictions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: lease.id,
          noticeType,
          reason,
          amountOwed: amountOwed ? parseFloat(amountOwed) : undefined,
          additionalNotes: additionalNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create eviction notice');
      }

      toast({
        description: `Eviction notice created. Deadline: ${new Date(data.deadlineDate).toLocaleDateString()}`,
      });

      // Reset form
      setNoticeType('3-day');
      setReason('');
      setAmountOwed('');
      setAdditionalNotes('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        description: error?.message || 'Failed to create eviction notice',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDeadline = () => {
    const days = noticeType === '3-day' ? 3 : noticeType === '7-day' ? 7 : 30;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline.toLocaleDateString();
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Start Eviction Notice"
      description={`Create an eviction notice for ${lease.tenant.name}`}
    >
      <div className="space-y-4 py-4">
        {/* Tenant Info */}
        <div className="rounded-lg bg-slate-800/60 border border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="font-medium text-white">{lease.tenant.name}</p>
              <p className="text-xs text-slate-400">{lease.tenant.email}</p>
            </div>
          </div>
        </div>

        {/* Notice Type */}
        <div className="space-y-2">
          <Label className="text-slate-200">Notice Type</Label>
          <Select value={noticeType} onValueChange={(v) => setNoticeType(v as NoticeType)}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {NOTICE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-white">
                  <div>
                    <span className="font-medium">{type.label}</span>
                    <span className="text-slate-400 ml-2 text-xs">— {type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Deadline Preview */}
        <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/40 rounded-lg p-3">
          <Calendar className="h-4 w-4 text-amber-400" />
          <span>Deadline will be: <strong className="text-white">{calculateDeadline()}</strong></span>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label className="text-slate-200">Reason for Eviction *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Non-payment of rent, lease violation, etc."
            className="bg-slate-800 border-white/10 text-white min-h-[80px]"
          />
        </div>

        {/* Amount Owed (optional) */}
        <div className="space-y-2">
          <Label className="text-slate-200">Amount Owed (optional)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amountOwed}
              onChange={(e) => setAmountOwed(e.target.value)}
              placeholder="0.00"
              className="bg-slate-800 border-white/10 text-white pl-7"
            />
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label className="text-slate-200">Additional Notes (optional)</Label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any additional information..."
            className="bg-slate-800 border-white/10 text-white min-h-[60px]"
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
            disabled={isSubmitting || !reason.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Create Notice
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
