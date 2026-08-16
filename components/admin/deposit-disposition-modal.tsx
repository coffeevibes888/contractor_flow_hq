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
import { EvidenceUpload } from './evidence-upload';
import { 
  Loader2, 
  Wallet, 
  Plus, 
  Trash2, 
  DollarSign,
  AlertCircle 
} from 'lucide-react';
import type { 
  DeductionCategory, 
  DepositRefundMethod,
  DepositDispositionModalProps,
  DeductionItemFormData,
  UploadedEvidence,
} from '@/types/tenant-lifecycle';

const DEDUCTION_CATEGORIES: { value: DeductionCategory; label: string }[] = [
  { value: 'damages', label: 'Property Damages' },
  { value: 'unpaid_rent', label: 'Unpaid Rent' },
  { value: 'cleaning', label: 'Cleaning Fees' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'other', label: 'Other' },
];

const REFUND_METHODS: { value: DepositRefundMethod; label: string }[] = [
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH Transfer' },
  { value: 'pending', label: 'Pending Decision' },
];

export function DepositDispositionModal({
  isOpen,
  onClose,
  lease,
  depositAmount,
  outstandingBalance,
  onSuccess,
}: DepositDispositionModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deductions, setDeductions] = useState<DeductionItemFormData[]>([]);
  const [refundMethod, setRefundMethod] = useState<DepositRefundMethod>('pending');
  const [notes, setNotes] = useState('');

  // Calculate totals
  const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  const refundAmount = Math.max(0, depositAmount - totalDeductions);

  const addDeduction = () => {
    setDeductions([
      ...deductions,
      {
        id: crypto.randomUUID(),
        category: 'damages',
        amount: 0,
        description: '',
        evidenceUrls: [],
      },
    ]);
  };

  const updateDeduction = (id: string, updates: Partial<DeductionItemFormData>) => {
    setDeductions(
      deductions.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter((d) => d.id !== id));
  };

  const handleEvidenceUpload = (id: string, files: UploadedEvidence[]) => {
    updateDeduction(id, { evidenceUrls: files.map((f) => f.url) });
  };

  const handleSubmit = async () => {
    // Validate deductions
    for (const deduction of deductions) {
      if (!deduction.description.trim()) {
        toast({
          variant: 'destructive',
          description: 'Please provide a description for all deductions.',
        });
        return;
      }
      if (deduction.amount <= 0) {
        toast({
          variant: 'destructive',
          description: 'Deduction amounts must be greater than zero.',
        });
        return;
      }
    }

    if (totalDeductions > depositAmount) {
      toast({
        variant: 'destructive',
        description: 'Total deductions cannot exceed the deposit amount.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/deposits/disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: lease.id,
          originalAmount: depositAmount,
          deductions: deductions.map((d) => ({
            category: d.category,
            amount: d.amount,
            description: d.description,
            evidenceUrls: d.evidenceUrls,
          })),
          refundMethod,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create deposit disposition');
      }

      toast({
        description: `Deposit disposition created. Refund amount: $${refundAmount.toFixed(2)}`,
      });

      // Reset form
      setDeductions([]);
      setRefundMethod('pending');
      setNotes('');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        description: error?.message || 'Failed to create deposit disposition',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Process Deposit Return"
      description={`Process security deposit for ${lease.tenant.name}`}
      className="sm:max-w-2xl"
    >
      <div className="space-y-4 py-4">
        {/* Deposit Summary */}
        <div className="rounded-lg bg-slate-800/60 border border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-white">{lease.tenant.name}</p>
              <p className="text-xs text-slate-400">Security Deposit</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-400">Original Deposit</p>
              <p className="text-lg font-semibold text-white">${depositAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Deductions</p>
              <p className="text-lg font-semibold text-red-400">-${totalDeductions.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Refund</p>
              <p className="text-lg font-semibold text-emerald-400">${refundAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Outstanding Balance Warning */}
        {outstandingBalance > 0 && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div className="text-sm text-amber-300">
                <p className="font-medium">Outstanding Balance: ${outstandingBalance.toFixed(2)}</p>
                <p className="text-xs mt-1">Consider adding an "Unpaid Rent" deduction.</p>
              </div>
            </div>
          </div>
        )}

        {/* Deductions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-200">Deductions</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDeduction}
              className="border-white/20 text-slate-300 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Deduction
            </Button>
          </div>

          {deductions.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500 border border-dashed border-white/10 rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No deductions added</p>
              <p className="text-xs mt-1">Full deposit will be refunded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deductions.map((deduction, index) => (
                <div
                  key={deduction.id}
                  className="rounded-lg bg-slate-800/40 border border-white/10 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">
                      Deduction #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeduction(deduction.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Category</Label>
                      <Select
                        value={deduction.category}
                        onValueChange={(v) =>
                          updateDeduction(deduction.id, { category: v as DeductionCategory })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-white/10 text-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {DEDUCTION_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value} className="text-white">
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={deduction.amount || ''}
                          onChange={(e) =>
                            updateDeduction(deduction.id, {
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="bg-slate-800 border-white/10 text-white pl-7 h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Description</Label>
                    <Textarea
                      value={deduction.description}
                      onChange={(e) =>
                        updateDeduction(deduction.id, { description: e.target.value })
                      }
                      placeholder="Describe the damage or charge..."
                      className="bg-slate-800 border-white/10 text-white min-h-[60px]"
                    />
                  </div>

                  <EvidenceUpload
                    existingFiles={deduction.evidenceUrls.map((url, i) => ({
                      url,
                      publicId: `evidence-${i}`,
                      type: 'image' as const,
                      fileName: `Evidence ${i + 1}`,
                    }))}
                    onUpload={(files) => handleEvidenceUpload(deduction.id, files)}
                    onRemove={(idx) => {
                      const newUrls = [...deduction.evidenceUrls];
                      newUrls.splice(idx, 1);
                      updateDeduction(deduction.id, { evidenceUrls: newUrls });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refund Method */}
        <div className="space-y-2">
          <Label className="text-slate-200">Refund Method</Label>
          <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as DepositRefundMethod)}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {REFUND_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value} className="text-white">
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-slate-200">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
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
            disabled={isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Process Deposit
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
