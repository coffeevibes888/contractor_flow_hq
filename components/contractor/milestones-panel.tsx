'use client';

/**
 * MilestonesPanel — drop-in UI for milestone-based escrow releases.
 *
 * Behavior:
 *   - PM (landlord) can build a milestone plan when none exists yet
 *     (only valid while job is `funded`).
 *   - Contractor can upload materials receipts to milestones with
 *     releaseRule='on_receipts'.
 *   - PM clicks "Release" on each milestone to transfer the milestone
 *     amount to the contractor's connected account.
 *
 * Designed to render below or beside <JobTracker />. Self-fetches its
 * own state so the host page doesn't need to pre-load milestones.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Trophy, Plus, Trash2, Loader2, DollarSign, Package, Wrench, Flag,
  CheckCircle2, Clock, FileText, Upload, ShieldCheck, Sparkles,
  AlertTriangle, ArrowRight,
} from 'lucide-react';

type ReleaseRule = 'on_start' | 'on_receipts' | 'on_midpoint' | 'on_completion' | 'manual';
type MilestoneStatus = 'pending' | 'ready' | 'released' | 'refunded';

interface Milestone {
  id: string;
  order: number;
  title: string;
  description: string | null;
  amount: string;
  releaseRule: ReleaseRule;
  status: MilestoneStatus;
  receiptUrls: string[];
  releasedAt: string | null;
}

interface Props {
  workOrderId: string;
  viewerRole: 'landlord' | 'contractor';
  totalEscrow: number;
  /** lifecycle must be 'funded' for the PM to be able to create milestones */
  lifecycleStatus: string;
}

const RULE_META: Record<ReleaseRule, { label: string; icon: React.ElementType; classes: string }> = {
  on_start:      { label: 'On Start',       icon: Flag,         classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  on_receipts:   { label: 'After Receipts', icon: Package,      classes: 'bg-violet-50 text-violet-700 border-violet-200' },
  on_midpoint:   { label: 'At Midpoint',    icon: Wrench,       classes: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  on_completion: { label: 'On Completion',  icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  manual:        { label: 'Manual Release', icon: ShieldCheck,  classes: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function MilestonesPanel({
  workOrderId, viewerRole, totalEscrow, lifecycleStatus,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState<Milestone | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');

  const isOwner = viewerRole === 'landlord';
  const isContractor = viewerRole === 'contractor';

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/milestones`);
      const data = await res.json();
      if (data.success) setMilestones(data.milestones);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Don't render anything if there are no milestones AND viewer can't create
  // them (we don't want to clutter the contractor UI).
  if (loading) return null;
  if (milestones.length === 0 && !(isOwner && lifecycleStatus === 'funded')) {
    return null;
  }

  const totalReleased = milestones
    .filter((m) => m.status === 'released')
    .reduce((s, m) => s + Number(m.amount), 0);

  const release = async (m: Milestone) => {
    setBusy(m.id);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/milestones/${m.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Release failed');
      toast({ title: 'Milestone released ✓', description: `$${Number(m.amount).toLocaleString()} sent to contractor.` });
      await load();
      router.refresh();
    } catch (e) {
      toast({ title: 'Could not release', description: e instanceof Error ? e.message : 'Try again', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const uploadReceipt = async () => {
    if (!receiptOpen || !receiptUrl.trim()) return;
    setBusy(receiptOpen.id);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/milestones/${receiptOpen.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload_receipts', receiptUrls: [receiptUrl.trim()] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      toast({ title: 'Receipt added ✓' });
      setReceiptOpen(null);
      setReceiptUrl('');
      await load();
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : 'Try again', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-violet-200 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-slate-900">
            <Trophy className="h-5 w-5 text-violet-600" />
            Milestone Payments
          </span>
          {milestones.length > 0 && (
            <Badge variant="outline" className="bg-white border-violet-200 text-violet-700">
              ${totalReleased.toLocaleString()} of ${totalEscrow.toLocaleString()} released
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 space-y-3">
        {/* Empty state for PM */}
        {milestones.length === 0 && isOwner && lifecycleStatus === 'funded' && (
          <div className="text-center py-6 px-4 rounded-xl bg-gradient-to-br from-violet-50/50 to-purple-50/50 border border-dashed border-violet-200">
            <Sparkles className="h-8 w-8 mx-auto text-violet-400 mb-2" />
            <h4 className="font-semibold text-slate-900 mb-1">Split this job into milestones</h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto mb-3">
              Recommended for jobs over $2,000. Release payment in chunks tied to progress —
              like a 30% materials advance, 40% midpoint, 30% on completion.
            </p>
            <Button onClick={() => setBuilderOpen(true)} className="bg-gradient-to-r from-violet-600 to-purple-600">
              <Plus className="h-4 w-4 mr-2" />Set Up Milestones
            </Button>
          </div>
        )}

        {/* Existing milestones */}
        {milestones.length > 0 && (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                style={{ width: totalEscrow ? `${(totalReleased / totalEscrow) * 100}%` : '0%' }}
              />
            </div>

            {milestones.map((m) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                viewerRole={viewerRole}
                busy={busy === m.id}
                onRelease={() => release(m)}
                onUploadReceipt={() => setReceiptOpen(m)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Builder dialog */}
      <MilestoneBuilderDialog
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        workOrderId={workOrderId}
        totalEscrow={totalEscrow}
        onCreated={() => {
          setBuilderOpen(false);
          load();
        }}
      />

      {/* Upload receipt dialog */}
      <Dialog open={!!receiptOpen} onOpenChange={(o) => !o && setReceiptOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-violet-600" />Upload Receipt
            </DialogTitle>
            <DialogDescription>
              Add a link to your materials receipt so the PM can verify before releasing this milestone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Receipt URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Tip: upload the receipt photo to the chat or use a service like UploadThing, then paste the URL here.
            </p>
            {receiptOpen && receiptOpen.receiptUrls.length > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-700">Already uploaded:</p>
                {receiptOpen.receiptUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="block text-xs text-violet-600 hover:underline truncate">
                    {u}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReceiptOpen(null)}>Cancel</Button>
            <Button onClick={uploadReceipt} disabled={!receiptUrl || busy === receiptOpen?.id} className="bg-violet-600">
              {busy === receiptOpen?.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ──────────── single milestone row ──────────── */
function MilestoneRow({
  milestone, viewerRole, busy, onRelease, onUploadReceipt,
}: {
  milestone: Milestone;
  viewerRole: 'landlord' | 'contractor';
  busy: boolean;
  onRelease: () => void;
  onUploadReceipt: () => void;
}) {
  const m = milestone;
  const rule = RULE_META[m.releaseRule];
  const RuleIcon = rule.icon;
  const isReleased = m.status === 'released';
  const isOwner = viewerRole === 'landlord';
  const isContractor = viewerRole === 'contractor';

  const needsReceipts =
    m.releaseRule === 'on_receipts' && m.receiptUrls.length === 0;

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        isReleased
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-slate-200 bg-white hover:border-violet-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Order pill */}
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
              isReleased
                ? 'bg-emerald-500 text-white'
                : 'bg-gradient-to-br from-violet-500 to-purple-500 text-white'
            }`}
          >
            {isReleased ? <CheckCircle2 className="h-5 w-5" /> : m.order}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-900">{m.title}</h4>
              <Badge variant="outline" className={`text-[10px] ${rule.classes}`}>
                <RuleIcon className="h-2.5 w-2.5 mr-0.5" />{rule.label}
              </Badge>
              {isReleased && (
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Released
                </Badge>
              )}
              {needsReceipts && !isReleased && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />Awaiting receipts
                </Badge>
              )}
            </div>
            {m.description && <p className="text-xs text-slate-600 mt-1">{m.description}</p>}
            {m.receiptUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.receiptUrls.map((u, i) => (
                  <a
                    key={i}
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-violet-600 hover:underline bg-violet-50 px-2 py-0.5 rounded"
                  >
                    <FileText className="h-2.5 w-2.5" />Receipt {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-slate-900">${Number(m.amount).toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      {!isReleased && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end gap-2 flex-wrap">
          {isContractor && m.releaseRule === 'on_receipts' && (
            <Button size="sm" variant="outline" onClick={onUploadReceipt} className="border-violet-200 text-violet-700 hover:bg-violet-50">
              <Upload className="h-3.5 w-3.5 mr-1" />Upload Receipt
            </Button>
          )}
          {isOwner && (
            <Button
              size="sm"
              onClick={onRelease}
              disabled={busy || needsReceipts}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-1" />}
              Release ${Number(m.amount).toLocaleString()}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────── milestone builder dialog ──────────── */
interface BuilderDraft {
  title: string;
  description: string;
  amount: string;
  releaseRule: ReleaseRule;
}

function MilestoneBuilderDialog({
  open, onClose, workOrderId, totalEscrow, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
  totalEscrow: number;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Sensible default: 30% materials / 40% midpoint / 30% completion
  const defaultDraft = (): BuilderDraft[] => [
    { title: 'Materials Advance',  description: '', amount: (totalEscrow * 0.3).toFixed(2), releaseRule: 'on_receipts' },
    { title: 'Midpoint Progress',  description: '', amount: (totalEscrow * 0.4).toFixed(2), releaseRule: 'on_midpoint' },
    { title: 'Final Completion',   description: '', amount: (totalEscrow * 0.3).toFixed(2), releaseRule: 'on_completion' },
  ];
  const [drafts, setDrafts] = useState<BuilderDraft[]>(defaultDraft);

  useEffect(() => { if (open) setDrafts(defaultDraft()); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [open, totalEscrow]);

  const sum = drafts.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const matches = Math.abs(sum - totalEscrow) < 0.01;

  const update = (idx: number, patch: Partial<BuilderDraft>) =>
    setDrafts((d) => d.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const remove = (idx: number) => setDrafts((d) => d.filter((_, i) => i !== idx));
  const add = () =>
    setDrafts((d) => [...d, { title: '', description: '', amount: '0', releaseRule: 'manual' }]);

  const submit = async () => {
    if (!matches) {
      toast({
        title: 'Amounts don\'t match',
        description: `Milestone total ($${sum.toLocaleString()}) must equal escrow ($${totalEscrow.toLocaleString()}).`,
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones: drafts.map((d, i) => ({
            title: d.title.trim(),
            description: d.description.trim() || undefined,
            amount: parseFloat(d.amount),
            releaseRule: d.releaseRule,
            order: i + 1,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create milestones');
      toast({ title: 'Milestones created ✓' });
      onCreated();
    } catch (e) {
      toast({ title: 'Could not create', description: e instanceof Error ? e.message : 'Try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />Set Up Milestones
          </DialogTitle>
          <DialogDescription>
            Break the ${totalEscrow.toLocaleString()} escrow into release milestones. Total must equal escrow exactly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {drafts.map((d, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">Milestone #{idx + 1}</p>
                {drafts.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => remove(idx)} className="text-red-500 h-6">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder="e.g., Materials Advance"
                    value={d.title}
                    onChange={(e) => update(idx, { title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-7"
                      value={d.amount}
                      onChange={(e) => update(idx, { amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Release rule</Label>
                  <select
                    className="w-full text-sm border border-slate-200 rounded-md px-2 py-2 bg-white"
                    value={d.releaseRule}
                    onChange={(e) => update(idx, { releaseRule: e.target.value as ReleaseRule })}
                  >
                    <option value="on_start">On Start</option>
                    <option value="on_receipts">After Receipts Uploaded</option>
                    <option value="on_midpoint">At Midpoint</option>
                    <option value="on_completion">On Completion</option>
                    <option value="manual">Manual Release</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea
                  rows={1}
                  placeholder="What's included in this milestone?"
                  value={d.description}
                  onChange={(e) => update(idx, { description: e.target.value })}
                />
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={add} size="sm" className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-2" />Add Milestone
          </Button>

          {/* Sum bar */}
          <div
            className={`rounded-lg p-3 border flex items-center justify-between ${
              matches ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="text-xs">
              <p className="font-semibold text-slate-900">
                Total: ${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-slate-600">
                Escrow: ${totalEscrow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {matches ? (
              <Badge className="bg-emerald-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />Matches
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                ${Math.abs(sum - totalEscrow).toLocaleString(undefined, { maximumFractionDigits: 2 })} off
              </Badge>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !matches} className="bg-gradient-to-r from-violet-600 to-purple-600">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Milestones <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
