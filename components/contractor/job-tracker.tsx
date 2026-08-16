'use client';

/**
 * JobTracker — Uber-style live tracker for a WorkOrder.
 *
 * Renders three things:
 *   1. A status pill ("Funded & Secured", color-coded)
 *   2. A horizontal timeline ribbon with completed / current / pending dots
 *   3. A contextual action panel (Start Work, Mark Complete, Approve, etc.)
 *      with friendly explainer text per stage.
 *
 * Works for both the contractor and the property manager — pass the
 * `viewerRole` so we render the right buttons.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Circle, Clock, ShieldCheck, Wrench, CalendarCheck,
  PlayCircle, Eye, BadgeCheck, AlertTriangle, Loader2, Send, X,
  Sparkles, DollarSign, Lock, Hourglass, ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type LifecycleStatus =
  | 'pending' | 'funded' | 'scheduled' | 'in_progress'
  | 'awaiting_approval' | 'released' | 'disputed' | 'refunded' | 'cancelled';

const STEPS: {
  key: LifecycleStatus;
  short: string;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: 'pending', short: 'Quote', label: 'Quote Sent', icon: Send },
  { key: 'funded', short: 'Funded', label: 'Accepted & Funded', icon: ShieldCheck },
  { key: 'scheduled', short: 'Scheduled', label: 'Scheduled', icon: CalendarCheck },
  { key: 'in_progress', short: 'Working', label: 'In Progress', icon: Wrench },
  { key: 'awaiting_approval', short: 'Review', label: 'Awaiting Approval', icon: Eye },
  { key: 'released', short: 'Done', label: 'Paid & Complete', icon: BadgeCheck },
];

const TONE: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  slate:   { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300',   ring: 'ring-slate-300' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300',    ring: 'ring-blue-300' },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-cyan-300',    ring: 'ring-cyan-300' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', ring: 'ring-emerald-300' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   ring: 'ring-amber-300' },
  red:     { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     ring: 'ring-red-300' },
};

const STATUS_META: Record<LifecycleStatus, { label: string; tone: keyof typeof TONE; tagline: string }> = {
  pending:           { label: 'Awaiting Acceptance', tone: 'slate',   tagline: 'Waiting for the property manager to accept a quote.' },
  funded:            { label: 'Funded & Secured',    tone: 'emerald', tagline: 'Funds are held safely until work is complete.' },
  scheduled:         { label: 'Scheduled',           tone: 'blue',    tagline: 'Start date confirmed.' },
  in_progress:       { label: 'In Progress',         tone: 'cyan',    tagline: 'Work is actively underway.' },
  awaiting_approval: { label: 'Awaiting Approval',   tone: 'amber',   tagline: 'Work complete — PM has 5 days to review.' },
  released:          { label: 'Paid & Complete',     tone: 'emerald', tagline: 'Funds released to the contractor.' },
  disputed:          { label: 'Under Dispute',       tone: 'red',     tagline: 'Concern raised — funds frozen until resolved.' },
  refunded:          { label: 'Refunded',            tone: 'slate',   tagline: 'Funds returned to the property manager.' },
  cancelled:         { label: 'Cancelled',           tone: 'slate',   tagline: 'This job was cancelled before work began.' },
};

export interface JobTrackerProps {
  workOrderId: string;
  lifecycleStatus: LifecycleStatus;
  viewerRole: 'landlord' | 'contractor';
  escrowAmount: number | null;
  pmApprovalDeadline: string | null;
  scheduledDate: string | null;
  contractorPaymentReady?: boolean;
}

export default function JobTracker({
  workOrderId,
  lifecycleStatus,
  viewerRole,
  escrowAmount,
  pmApprovalDeadline,
  scheduledDate,
  contractorPaymentReady = true,
}: JobTrackerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [busy, setBusy] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(scheduledDate?.split('T')[0] || '');
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('quality');
  const [disputeDescription, setDisputeDescription] = useState('');

  // Live countdown for the approval window
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (lifecycleStatus !== 'awaiting_approval' || !pmApprovalDeadline) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [lifecycleStatus, pmApprovalDeadline]);

  const meta = STATUS_META[lifecycleStatus];
  const tone = TONE[meta.tone];
  const isOffPath = ['disputed', 'refunded', 'cancelled'].includes(lifecycleStatus);
  const currentStepIdx = STEPS.findIndex((s) => s.key === lifecycleStatus);

  // ─────────────── helpers ───────────────
  const post = async (path: string, body: unknown, label: string) => {
    setBusy(label);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      toast({ title: 'Success', description: 'Status updated' });
      router.refresh();
      return data;
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
      throw e;
    } finally {
      setBusy(null);
    }
  };

  const callLifecycle = (action: string, extra: Record<string, unknown> = {}) =>
    post(`/api/work-orders/${workOrderId}/lifecycle`, { action, ...extra }, action);

  const submitDispute = async () => {
    if (disputeDescription.trim().length < 20) {
      toast({
        title: 'More detail needed',
        description: 'Please describe the issue in at least 20 characters.',
        variant: 'destructive',
      });
      return;
    }
    await post(
      `/api/work-orders/${workOrderId}/dispute`,
      { reason: disputeReason, description: disputeDescription },
      'dispute'
    );
    setDisputeOpen(false);
  };

  // ─────────────── countdown ───────────────
  let countdownText: string | null = null;
  if (lifecycleStatus === 'awaiting_approval' && pmApprovalDeadline) {
    const deadline = new Date(pmApprovalDeadline);
    const ms = deadline.getTime() - now.getTime();
    if (ms <= 0) {
      countdownText = 'Auto-release imminent';
    } else {
      const days = Math.floor(ms / (24 * 3600 * 1000));
      const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
      countdownText = days > 0 ? `${days}d ${hours}h until auto-release` : `${hours}h until auto-release`;
    }
  }

  return (
    <Card className="overflow-hidden border-2 border-slate-200 shadow-md">
      {/* Hero header */}
      <div className={`${tone.bg} px-5 py-4 border-b ${tone.border} flex items-start justify-between gap-3`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={`h-10 w-10 rounded-xl ${tone.bg} ring-2 ${tone.ring} flex items-center justify-center bg-white shrink-0`}>
            {lifecycleStatus === 'released' ? <BadgeCheck className={`h-5 w-5 ${tone.text}`} /> :
             lifecycleStatus === 'disputed' ? <AlertTriangle className={`h-5 w-5 ${tone.text}`} /> :
             lifecycleStatus === 'awaiting_approval' ? <Hourglass className={`h-5 w-5 ${tone.text}`} /> :
             lifecycleStatus === 'in_progress' ? <Wrench className={`h-5 w-5 ${tone.text}`} /> :
             lifecycleStatus === 'funded' ? <Lock className={`h-5 w-5 ${tone.text}`} /> :
             <Sparkles className={`h-5 w-5 ${tone.text}`} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-lg font-bold ${tone.text}`}>{meta.label}</h3>
              {countdownText && (
                <Badge className="bg-white text-amber-700 border border-amber-300">
                  <Clock className="h-3 w-3 mr-1" />{countdownText}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{meta.tagline}</p>
          </div>
        </div>
        {escrowAmount !== null && (
          <div className="text-right shrink-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Held in escrow</p>
            <p className={`text-2xl font-black ${tone.text}`}>${escrowAmount.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Timeline ribbon */}
      {!isOffPath && (
        <div className="px-5 py-6 bg-white border-b border-slate-100">
          <div className="relative flex items-center justify-between">
            {/* Track line */}
            <div className="absolute top-5 left-5 right-5 h-1 bg-slate-200 rounded-full" />
            <div
              className="absolute top-5 left-5 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{
                width:
                  currentStepIdx <= 0
                    ? '0%'
                    : `calc((${currentStepIdx} / ${STEPS.length - 1}) * (100% - 2.5rem))`,
              }}
            />
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const done = idx < currentStepIdx;
              const current = idx === currentStepIdx;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center w-12 sm:w-20">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm
                      ${done ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' : ''}
                      ${current ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white ring-4 ring-cyan-200 scale-110' : ''}
                      ${!done && !current ? 'bg-white text-slate-300 border-2 border-slate-200' : ''}`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <p
                    className={`mt-2 text-[10px] sm:text-xs font-semibold text-center hidden sm:block
                      ${done ? 'text-emerald-700' : current ? 'text-blue-700' : 'text-slate-400'}`}
                  >
                    {step.short}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isOffPath && (
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-sm text-slate-600">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          This job is off the normal flow due to a {lifecycleStatus} state. See actions below.
        </div>
      )}

      {/* Action panel */}
      <CardContent className="p-5 space-y-4 bg-gradient-to-br from-white to-slate-50/50">
        <ActionPanel
          status={lifecycleStatus}
          viewerRole={viewerRole}
          contractorPaymentReady={contractorPaymentReady}
          busy={busy}
          onStart={() => callLifecycle('start_work')}
          onSchedule={() => setScheduleOpen(true)}
          onComplete={() => setCompleteOpen(true)}
          onApprove={() => callLifecycle('approve')}
          onCancel={() => callLifecycle('cancel')}
          onDispute={() => setDisputeOpen(true)}
        />
      </CardContent>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-blue-600" />Confirm Start Date</DialogTitle>
            <DialogDescription>Let the property manager know when you&apos;ll arrive.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Start date</Label>
            <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              disabled={!scheduleDate || busy === 'schedule'}
              onClick={async () => {
                await callLifecycle('schedule', { scheduledDate: scheduleDate });
                setScheduleOpen(false);
              }}
              className="bg-gradient-to-r from-blue-600 to-cyan-500"
            >
              {busy === 'schedule' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-amber-600" />Mark Job Complete</DialogTitle>
            <DialogDescription>
              The PM will have <strong>5 days</strong> to review and approve. After that, funds auto-release to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Wrap-up note (optional)</Label>
            <Textarea
              rows={3}
              placeholder="e.g., Replaced 3 outlets, tested all circuits, cleaned up workspace."
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
            />
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Tip: upload final photos via the chat above before marking complete — it speeds up approval.</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
            <Button
              disabled={busy === 'mark_complete'}
              onClick={async () => {
                await callLifecycle('mark_complete', { note: completeNote || undefined });
                setCompleteOpen(false);
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              {busy === 'mark_complete' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />Open a Dispute
            </DialogTitle>
            <DialogDescription>
              Funds will be frozen while we review. Most disputes are resolved within 3 business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>What&apos;s the issue?</Label>
              <select
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              >
                <option value="quality">Poor quality of work</option>
                <option value="incomplete">Job is incomplete</option>
                <option value="no_show">Contractor didn&apos;t show up</option>
                <option value="overcharge">Unauthorized charges</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Describe the issue (min 20 chars)</Label>
              <Textarea
                rows={4}
                placeholder="Be specific. Include dates, amounts, and any prior conversations."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
              />
              <p className="text-xs text-slate-500">{disputeDescription.length}/20 minimum</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy === 'dispute' || disputeDescription.trim().length < 20}
              onClick={submitDispute}
            >
              {busy === 'dispute' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              File Dispute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ──────────── Sub-component: contextual action card ──────────── */

interface ActionPanelProps {
  status: LifecycleStatus;
  viewerRole: 'landlord' | 'contractor';
  contractorPaymentReady: boolean;
  busy: string | null;
  onStart: () => void;
  onSchedule: () => void;
  onComplete: () => void;
  onApprove: () => void;
  onCancel: () => void;
  onDispute: () => void;
}

function ActionPanel(props: ActionPanelProps) {
  const { status, viewerRole, busy, contractorPaymentReady } = props;
  const isContractor = viewerRole === 'contractor';
  const isOwner = viewerRole === 'landlord';

  // Helper: explainer card
  type ExplainProps = {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
    tone?: keyof typeof TONE;
  };
  const Explain = ({ icon: Icon, title, children, tone = 'slate' }: ExplainProps) => {
    const t = TONE[tone];
    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg ${t.bg} border ${t.border}`}>
        <Icon className={`h-5 w-5 ${t.text} shrink-0 mt-0.5`} />
        <div className="text-sm">
          <p className={`font-semibold ${t.text}`}>{title}</p>
          <div className="text-slate-700 text-xs mt-0.5">{children}</div>
        </div>
      </div>
    );
  };

  switch (status) {
    case 'pending':
      return isOwner ? (
        <Explain icon={Send} title="Pick a winning quote" tone="blue">
          Review submitted bids and click <strong>Accept &amp; Pay</strong> on the quote you want.
          Funds will be held securely until the work is complete.
        </Explain>
      ) : (
        <Explain icon={Hourglass} title="Awaiting acceptance" tone="slate">
          The property manager is reviewing quotes. You&apos;ll get a notification when they pick one.
        </Explain>
      );

    case 'funded':
      return (
        <div className="space-y-3">
          <Explain icon={Lock} title="Funds secured ✓" tone="emerald">
            Money is held safely. The contractor can begin scheduling and starting work. No funds move
            until you both agree the job is complete (or 5 days pass with no objection).
          </Explain>
          {isContractor && (
            <div className="flex gap-2">
              <Button onClick={props.onSchedule} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500" disabled={!!busy}>
                <CalendarCheck className="h-4 w-4 mr-2" />Schedule Start
              </Button>
              <Button onClick={props.onStart} variant="outline" disabled={!!busy}>
                <PlayCircle className="h-4 w-4 mr-2" />Start Now
              </Button>
            </div>
          )}
          {isOwner && (
            <Button onClick={props.onCancel} variant="outline" className="w-full text-slate-600" disabled={!!busy}>
              <X className="h-4 w-4 mr-2" />Cancel & Refund
            </Button>
          )}
        </div>
      );

    case 'scheduled':
      return (
        <div className="space-y-3">
          <Explain icon={CalendarCheck} title="Start date confirmed" tone="blue">
            The contractor has confirmed when they&apos;ll begin. You&apos;ll see a status update when they arrive.
          </Explain>
          {isContractor && (
            <Button onClick={props.onStart} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500" disabled={!!busy}>
              {busy === 'start_work' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              I&apos;ve Started Work
            </Button>
          )}
        </div>
      );

    case 'in_progress':
      return (
        <div className="space-y-3">
          <Explain icon={Wrench} title="Work in progress" tone="cyan">
            {isContractor
              ? 'Keep the PM in the loop with progress photos in chat. When done, click below to request approval.'
              : 'The contractor is on the job. You can chat with them anytime above.'}
          </Explain>
          {isContractor && (
            <Button onClick={props.onComplete} className="w-full bg-gradient-to-r from-amber-500 to-orange-500" disabled={!!busy}>
              <Eye className="h-4 w-4 mr-2" />Mark Complete & Request Approval
            </Button>
          )}
          {isOwner && (
            <Button onClick={props.onDispute} variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" disabled={!!busy}>
              <AlertTriangle className="h-4 w-4 mr-2" />Report an Issue
            </Button>
          )}
        </div>
      );

    case 'awaiting_approval':
      return (
        <div className="space-y-3">
          <Explain icon={Hourglass} title="Work complete — pending review" tone="amber">
            {isOwner
              ? 'Inspect the work. Approve to release funds instantly, or report an issue if something is wrong. If you do nothing, funds auto-release in 5 days.'
              : 'Sit tight — the PM is reviewing. If they don\'t respond in 5 days, funds auto-release to you.'}
          </Explain>
          {isOwner && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={props.onApprove} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30" disabled={!!busy}>
                {busy === 'approve' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
                Approve & Release Funds
              </Button>
              <Button onClick={props.onDispute} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={!!busy}>
                <AlertTriangle className="h-4 w-4 mr-2" />Report Issue
              </Button>
            </div>
          )}
          {isContractor && (
            <Button onClick={props.onDispute} variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-50" disabled={!!busy}>
              <AlertTriangle className="h-4 w-4 mr-2" />Something wrong? Open a dispute
            </Button>
          )}
        </div>
      );

    case 'released':
      return (
        <div className="space-y-3">
          <Explain icon={BadgeCheck} title="Job complete!" tone="emerald">
            {isContractor
              ? contractorPaymentReady
                ? 'Funds were transferred to your Stripe account. Standard payout takes 1–2 business days.'
                : 'Funds are reserved for you, but you need to finish Stripe onboarding before they can land in your bank.'
              : 'You approved the work and funds were released. Receipt available in your account history.'}
          </Explain>
          {isContractor && !contractorPaymentReady && (
            <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-blue-600">
              <a href="/contractor-dashboard/wallet">
                <DollarSign className="h-4 w-4 mr-2" />Finish Payment Setup<ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      );

    case 'disputed':
      return (
        <Explain icon={AlertTriangle} title="Dispute under review" tone="red">
          Our team is reviewing the case. Both parties can upload evidence in chat. We aim to resolve within 3 business days.
        </Explain>
      );

    case 'refunded':
      return (
        <Explain icon={X} title="Funds refunded" tone="slate">
          The escrowed amount was returned to the property manager. This job is closed.
        </Explain>
      );

    case 'cancelled':
      return (
        <Explain icon={X} title="Job cancelled" tone="slate">
          This job was cancelled before work started. No funds changed hands.
        </Explain>
      );

    default:
      return null;
  }
}
