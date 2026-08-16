'use client';

/**
 * ReceiptUploadDialog — manual-entry receipt + expense flow.
 *
 * This was previously an OCR-driven flow ("snap a photo, AI fills the
 * fields"). The OCR pipeline turned out to be unreliable in production, so
 * the new flow is:
 *
 *   Step 1 — pick the property the receipt belongs to
 *   Step 2 — upload the receipt image + enter amount / vendor / category
 *
 * The original OCR endpoints (`/api/documents/scan-receipt`,
 * `extractReceipt`) are still present in the codebase but no longer called
 * from this dialog. They can be re-enabled later without rewriting this UI.
 *
 * Persistence is unchanged: the upload still creates a ScannedDocument,
 * and `/api/documents/extract-receipt` still creates the Expense and links
 * the two via `convertedToExpenseId`.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  Loader2,
  CheckCircle2,
  Receipt,
  Building2,
  DollarSign,
  Calendar,
  Tag,
  Store,
  ScanLine,
  ArrowRight,
  X,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories';

interface Property {
  id: string;
  name: string;
  address: { city?: string; state?: string; street?: string; zipCode?: string } | null;
}

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  onSuccess: () => void;
  /**
   * When set, skip the upload step entirely — the dialog opens at the
   * "details" step and uses the existing document. Used by the receipts
   * grid's "Create Expense" CTA on legacy receipts that were uploaded
   * before this flow change.
   */
  existingDocumentId?: string;
  /** When set with `existingDocumentId`, skip the property step too. */
  existingDocumentPropertyId?: string;
}

type Step = 'property' | 'details';

export function ReceiptUploadDialog({
  open,
  onOpenChange,
  properties,
  onSuccess,
  existingDocumentId,
  existingDocumentPropertyId,
}: ReceiptUploadDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step state ────────────────────────────────────────────────────────────
  const initialStep: Step =
    existingDocumentId && existingDocumentPropertyId ? 'details' : 'property';
  const [step, setStep] = useState<Step>(initialStep);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    existingDocumentPropertyId ?? '',
  );

  // ── File / upload state ───────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(
    existingDocumentId ?? null,
  );

  // ── Expense fields (manual entry) ─────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Submission flags ──────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // Sync when caller hands us an existing document mid-flight
  useEffect(() => {
    if (open && existingDocumentId) {
      setUploadedDocId(existingDocumentId);
      if (existingDocumentPropertyId) {
        setSelectedPropertyId(existingDocumentPropertyId);
        setStep('details');
      } else {
        setStep('property');
      }
    }
  }, [open, existingDocumentId, existingDocumentPropertyId]);

  const resetForm = useCallback(() => {
    setStep(
      existingDocumentId && existingDocumentPropertyId ? 'details' : 'property',
    );
    setSelectedPropertyId(existingDocumentPropertyId ?? '');
    setFile(null);
    setUploadedDocId(existingDocumentId ?? null);
    setAmount('');
    setVendor('');
    setCategory('maintenance');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  }, [existingDocumentId, existingDocumentPropertyId]);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  };

  // ── Submit: upload (if needed) + create expense ──────────────────────────
  const handleSubmit = async () => {
    if (!selectedPropertyId) {
      toast({ title: 'Select a property', variant: 'destructive' });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: upload the file if we don't already have one. This creates
      // the ScannedDocument row and gives us back its id + Cloudinary URL.
      let docId = uploadedDocId;
      if (!docId) {
        if (!file) {
          toast({ title: 'Choose a receipt file', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'receipt');
        const uploadRes = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          toast({ title: 'Upload failed', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        const uploadData = await uploadRes.json();
        const doc = uploadData.documents?.[0];
        if (!doc?.id) {
          toast({ title: 'Upload failed — no document returned', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        docId = doc.id;
        setUploadedDocId(docId);
      }

      // Step 2: create the expense from the manual fields. The endpoint
      // already supports an `overrides` object that takes precedence over
      // anything OCR previously wrote, so the existing server contract is
      // a perfect fit for the manual-only flow.
      const overrides: Record<string, unknown> = {
        amount: parsedAmount,
        date,
        category,
      };
      if (vendor.trim()) overrides.vendor = vendor.trim();
      if (description.trim()) overrides.description = description.trim();

      const expenseRes = await fetch('/api/documents/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          propertyId: selectedPropertyId,
          overrides,
        }),
      });

      const result = await expenseRes.json().catch(() => ({}));

      if (expenseRes.ok && result.success) {
        const propName = properties.find((p) => p.id === selectedPropertyId)?.name;
        toast({
          title: 'Expense created',
          description: `$${parsedAmount.toFixed(2)} filed to ${propName ?? 'property'}.`,
        });
        await Promise.resolve(onSuccess());
        router.refresh();
        handleClose();
      } else {
        toast({
          title: 'Failed to create expense',
          description: result.message ?? `Server returned ${expenseRes.status}.`,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[ReceiptUploadDialog] submit error:', err);
      toast({
        title: 'Failed to save receipt',
        description: 'Network error — please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────────
  const STEPS: { key: Step; label: string }[] = [
    { key: 'property', label: 'Property' },
    { key: 'details', label: 'Receipt' },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg w-[calc(100vw-2rem)] mx-4 p-0 max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 pr-12 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Receipt className="h-5 w-5 text-emerald-500" />
            {step === 'property' && 'Pick a property'}
            {step === 'details' && 'Receipt details'}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {step === 'property' && 'Which property is this receipt for?'}
            {step === 'details' && 'Upload the receipt and log the expense.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-3 px-6 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  i < stepIndex
                    ? 'bg-emerald-500 text-white'
                    : i === stepIndex
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    i < stepIndex ? 'bg-emerald-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Scrollable body — keeps long forms inside the modal so the
            submit button is always reachable on shorter screens. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
          {/* ── Step 1: Property ─────────────────────────────────────────── */}
          {step === 'property' && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Building2 className="h-4 w-4 text-cyan-500" />
                  Property
                </Label>
                <Select
                  value={selectedPropertyId}
                  onValueChange={setSelectedPropertyId}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                    <SelectValue placeholder="Select a property…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          <span>{prop.name}</span>
                          {prop.address?.city && (
                            <span className="text-gray-400 text-xs">
                              ({prop.address.city})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setStep('details')}
                disabled={!selectedPropertyId}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {/* ── Step 2: Details ──────────────────────────────────────────── */}
          {step === 'details' && (
            <>
              {/* Property badge */}
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <Building2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-800">
                  {properties.find((p) => p.id === selectedPropertyId)?.name}
                </p>
              </div>

              {/* Upload tile (skipped when re-using an existing doc) */}
              {!uploadedDocId && (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      file
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {file ? (
                      <div className="space-y-1.5">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
                        <p className="text-sm font-semibold text-gray-800 truncate px-4">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <ScanLine className="h-8 w-8 mx-auto text-gray-300" />
                        <p className="text-sm font-medium text-gray-600">
                          Click to upload receipt
                        </p>
                        <p className="text-xs text-gray-400">
                          PDF, JPG, PNG, WEBP — max 10 MB
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {uploadedDocId && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-700">Receipt already attached</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                </div>
              )}

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    Amount *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Calendar className="h-3.5 w-3.5 text-violet-500" />
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Tag className="h-3.5 w-3.5 text-amber-500" />
                  Category *
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Store className="h-3.5 w-3.5 text-blue-500" />
                  Vendor
                </Label>
                <Input
                  placeholder="e.g., Home Depot, Lowe's"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="bg-white border-gray-200 text-gray-900"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Notes (optional)</Label>
                <Textarea
                  placeholder="What was this expense for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white border-gray-200 text-gray-900 min-h-[60px] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setStep('property')}
                  className="flex-1"
                  disabled={Boolean(existingDocumentPropertyId)}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !amount ||
                    (!file && !uploadedDocId)
                  }
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Save receipt
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
