'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft, Star, Shield, Award, Clock, MapPin, DollarSign,
  CheckCircle2, X as XIcon, ChevronDown, ChevronUp, MessageSquare,
  Sparkles, Wrench, Package, Calendar, Timer, FileCheck,
  AlertTriangle, Loader2, Lock, ShieldCheck, BadgeCheck, Briefcase,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import BidMessageThread from '@/components/contractor/bid-message-thread';
import JobTracker from '@/components/contractor/job-tracker';
import MilestonesPanel from '@/components/contractor/milestones-panel';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type LifecycleStatus =
  | 'pending' | 'funded' | 'scheduled' | 'in_progress'
  | 'awaiting_approval' | 'released' | 'disputed' | 'refunded' | 'cancelled';

interface Bid {
  id: string;
  amount: number;
  laborCost: number | null;
  materialsCost: number | null;
  estimatedHours: number | null;
  proposedStartDate: string | null;
  estimatedCompletionDate: string | null;
  inclusions: string[];
  exclusions: string[];
  warrantyDays: number | null;
  willPullPermits: boolean | null;
  paymentTerms: string | null;
  validUntil: string | null;
  message: string | null;
  status: string;
  messageCount: number;
  createdAt: string;
  contractor: {
    id: string;
    userId: string | null;
    name: string;
    email: string;
    image: string | null;
    specialties: string[];
    isPaymentReady: boolean;
    yearsExperience: number | null;
    licenseNumber: string | null;
    insuranceVerified: boolean;
    backgroundChecked: boolean;
    avgRating: number | null;
    totalReviews: number;
    completedJobs: number;
  };
}

interface Lifecycle {
  status: LifecycleStatus;
  escrowAmount: number | null;
  pmApprovalDeadline: string | null;
  scheduledDate: string | null;
  acceptedBidId: string | null;
}

interface Props {
  currentUserId: string;
  job: {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    budgetMin: number | null;
    budgetMax: number | null;
    property: { name: string; type: string; city: string; state: string };
    unit: string | null;
    mediaCount: number;
  };
  lifecycle: Lifecycle;
  bids: Bid[];
}

export default function BidsReviewClient({ currentUserId, job, lifecycle, bids }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
  const [chatBidId, setChatBidId] = useState<string | null>(null);

  // Accept & Pay flow state
  const [acceptBid, setAcceptBid] = useState<Bid | null>(null);
  const [creating, setCreating] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [contractorReady, setContractorReady] = useState<boolean>(true);

  // Stats
  const stats = useMemo(() => {
    if (bids.length === 0) return null;
    const amounts = bids.map((b) => b.amount);
    return {
      lowest: Math.min(...amounts),
      highest: Math.max(...amounts),
      average: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      count: bids.length,
    };
  }, [bids]);

  const acceptedBid = lifecycle.acceptedBidId
    ? bids.find((b) => b.id === lifecycle.acceptedBidId) ?? null
    : null;
  const isFunded = lifecycle.status !== 'pending';

  // ───────────── Accept & Pay: 1) create PaymentIntent ─────────────
  const startAcceptFlow = async (bid: Bid) => {
    setAcceptBid(bid);
    setCreating(true);
    try {
      const res = await fetch(`/api/work-orders/${job.id}/accept-and-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId: bid.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set up payment');
      setPaymentClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setContractorReady(!!data.contractorPaymentReady);
    } catch (e) {
      toast({
        title: 'Could not start payment',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
      setAcceptBid(null);
    } finally {
      setCreating(false);
    }
  };

  const closeAcceptFlow = () => {
    setAcceptBid(null);
    setPaymentClientSecret(null);
    setPaymentIntentId(null);
  };

  const onPaymentSuccess = () => {
    toast({
      title: '🎉 Funded!',
      description: 'Funds are held securely. The contractor will get to work.',
    });
    closeAcceptFlow();
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin/contractors" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-3">
            <ChevronLeft className="h-4 w-4" />Back to Contractor Work
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/80">
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.property.city}, {job.property.state}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{job.property.name}</span>
                {job.budgetMin && job.budgetMax && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />${job.budgetMin.toLocaleString()}–${job.budgetMax.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            {stats && (
              <div className="flex gap-3">
                <StatPill icon={MessageSquare} label="Bids" value={stats.count.toString()} tone="cyan" />
                <StatPill icon={TrendingDown} label="Lowest" value={`$${stats.lowest.toLocaleString()}`} tone="emerald" />
                <StatPill icon={TrendingUp} label="Highest" value={`$${stats.highest.toLocaleString()}`} tone="amber" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* JobTracker if funded */}
        {isFunded && (
          <>
            <JobTracker
              workOrderId={job.id}
              lifecycleStatus={lifecycle.status}
              viewerRole="landlord"
              escrowAmount={lifecycle.escrowAmount}
              pmApprovalDeadline={lifecycle.pmApprovalDeadline}
              scheduledDate={lifecycle.scheduledDate}
            />
            <MilestonesPanel
              workOrderId={job.id}
              viewerRole="landlord"
              totalEscrow={lifecycle.escrowAmount || 0}
              lifecycleStatus={lifecycle.status}
            />
          </>
        )}

        {/* Negotiation thread for accepted bid */}
        {isFunded && acceptedBid && (
          <BidMessageThread
            workOrderId={job.id}
            bidId={acceptedBid.id}
            currentUserId={currentUserId}
            otherPartyLabel={acceptedBid.contractor.name}
          />
        )}

        {/* Bid list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {isFunded ? 'All Bids' : 'Bids Received'}
              <span className="text-slate-400 font-normal ml-2">({bids.length})</span>
            </h2>
            {!isFunded && bids.length > 0 && (
              <p className="text-xs text-slate-500">Sorted by lowest price first</p>
            )}
          </div>

          {bids.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">No bids yet</h3>
                <p className="text-sm text-slate-500">Contractors will be able to bid as soon as they discover this job.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bids.map((bid, idx) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  rank={idx + 1}
                  isLowest={stats !== null && bid.amount === stats.lowest}
                  isAccepted={lifecycle.acceptedBidId === bid.id}
                  isLocked={isFunded && lifecycle.acceptedBidId !== bid.id}
                  expanded={expandedBidId === bid.id}
                  onToggleExpand={() => setExpandedBidId(expandedBidId === bid.id ? null : bid.id)}
                  onAcceptAndPay={() => startAcceptFlow(bid)}
                  onChat={() => setChatBidId(bid.id)}
                  jobTotal={job.budgetMax}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat dialog (negotiate without accepting yet) */}
      <Dialog open={!!chatBidId} onOpenChange={(open) => !open && setChatBidId(null)}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-5 py-4 border-b">
            <DialogTitle>Negotiate</DialogTitle>
            <DialogDescription>
              Chat with the contractor or send a counter-offer before accepting.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            {chatBidId && (
              <BidMessageThread
                workOrderId={job.id}
                bidId={chatBidId}
                currentUserId={currentUserId}
                otherPartyLabel={bids.find((b) => b.id === chatBidId)?.contractor.name || 'contractor'}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Accept & Pay dialog */}
      <Dialog open={!!acceptBid} onOpenChange={(open) => !open && closeAcceptFlow()}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />Fund This Job Securely
              </DialogTitle>
              <DialogDescription className="text-white/90">
                Your card is charged now and held safely by Stripe until the work is complete and approved.
              </DialogDescription>
            </DialogHeader>
          </div>

          {acceptBid && (
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Awarding to</p>
                    <p className="text-base font-bold text-slate-900">{acceptBid.contractor.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total</p>
                    <p className="text-2xl font-black text-emerald-600">${acceptBid.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {!contractorReady && paymentClientSecret && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Heads up:</strong> this contractor hasn&apos;t finished payment setup. Funds will be held safely
                    and released to them automatically once they complete onboarding. They&apos;ll be notified.
                  </div>
                </div>
              )}

              {creating && (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />Setting up secure payment...
                </div>
              )}

              {paymentClientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: paymentClientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#0ea5e9',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    amount={acceptBid.amount}
                    onSuccess={onPaymentSuccess}
                    onCancel={closeAcceptFlow}
                  />
                </Elements>
              )}

              <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5"><Lock className="h-3 w-3" />How it works</p>
                <ol className="space-y-0.5 list-decimal pl-4">
                  <li>Your card is charged the full amount now.</li>
                  <li>Funds are held by Stripe — neither party can touch them until work is complete.</li>
                  <li>You approve when satisfied → funds release to the contractor.</li>
                  <li>If you don&apos;t respond in 5 days after completion, funds auto-release.</li>
                  <li>Either side can dispute at any time — funds freeze until resolved.</li>
                </ol>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────── Stats pill ──────────── */
function StatPill({
  icon: Icon, label, value, tone,
}: { icon: React.ElementType; label: string; value: string; tone: 'cyan' | 'emerald' | 'amber' }) {
  const colors = {
    cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/30 text-cyan-300',
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30 text-emerald-300',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-400/30 text-amber-300',
  }[tone];
  return (
    <div className={`bg-gradient-to-br ${colors} border rounded-xl px-4 py-2.5 backdrop-blur-sm`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-80">
        <Icon className="h-3 w-3" />{label}
      </div>
      <p className="text-base font-bold text-white">{value}</p>
    </div>
  );
}

/* ──────────── Individual bid card ──────────── */
interface BidCardProps {
  bid: Bid;
  rank: number;
  isLowest: boolean;
  isAccepted: boolean;
  isLocked: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onAcceptAndPay: () => void;
  onChat: () => void;
  jobTotal: number | null;
}

function BidCard({
  bid, rank, isLowest, isAccepted, isLocked,
  expanded, onToggleExpand, onAcceptAndPay, onChat, jobTotal,
}: BidCardProps) {
  const c = bid.contractor;
  const savings = jobTotal ? jobTotal - bid.amount : 0;
  const savingsPct = jobTotal && savings > 0 ? Math.round((savings / jobTotal) * 100) : 0;

  return (
    <Card
      className={`transition-all overflow-hidden ${
        isAccepted
          ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-500/10 bg-gradient-to-br from-emerald-50/30 to-white'
          : isLocked
            ? 'opacity-60'
            : 'hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <CardContent className="p-0">
        {/* Top row */}
        <div className="p-5 grid md:grid-cols-12 gap-4 items-start">
          {/* Contractor block */}
          <div className="md:col-span-5 flex items-start gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  c.name.charAt(0).toUpperCase()
                )}
              </div>
              {isAccepted && (
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 truncate">{c.name}</h3>
                {isLowest && !isAccepted && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    <TrendingDown className="h-3 w-3 mr-0.5" />Lowest
                  </Badge>
                )}
                {isAccepted && (
                  <Badge className="bg-emerald-500 text-white text-[10px]">
                    <BadgeCheck className="h-3 w-3 mr-0.5" />Awarded
                  </Badge>
                )}
                {bid.status === 'declined' && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[10px]">Declined</Badge>
                )}
              </div>
              {/* Trust row */}
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                {c.avgRating !== null && c.avgRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <strong>{c.avgRating.toFixed(1)}</strong>
                    <span className="text-slate-400">({c.totalReviews})</span>
                  </span>
                )}
                {c.completedJobs > 0 && (
                  <span className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {c.completedJobs} job{c.completedJobs !== 1 ? 's' : ''}
                  </span>
                )}
                {c.yearsExperience !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {c.yearsExperience}y exp
                  </span>
                )}
              </div>
              {/* Verification badges */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {c.licenseNumber && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 h-5">
                    <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Licensed
                  </Badge>
                )}
                {c.insuranceVerified && (
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[10px] py-0 h-5">
                    <Shield className="h-2.5 w-2.5 mr-0.5" />Insured
                  </Badge>
                )}
                {c.backgroundChecked && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 h-5">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />BG Checked
                  </Badge>
                )}
                {c.isPaymentReady && (
                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px] py-0 h-5">
                    <DollarSign className="h-2.5 w-2.5 mr-0.5" />Payout Ready
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quote summary */}
          <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2 text-sm">
            <Stat label="Total" value={`$${bid.amount.toLocaleString()}`} highlight />
            {bid.estimatedHours !== null && <Stat label="Hours" value={`${bid.estimatedHours}`} />}
            {bid.proposedStartDate && (
              <Stat label="Start" value={new Date(bid.proposedStartDate).toLocaleDateString()} />
            )}
            {bid.warrantyDays !== null && <Stat label="Warranty" value={`${bid.warrantyDays}d`} />}
          </div>

          {/* Actions */}
          <div className="md:col-span-3 flex flex-col gap-2">
            {isAccepted ? (
              <Badge className="bg-emerald-500 text-white justify-center py-2">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />This bid won
              </Badge>
            ) : isLocked ? (
              <Badge variant="outline" className="justify-center py-2 bg-slate-50">
                Not selected
              </Badge>
            ) : (
              <>
                <Button
                  onClick={onAcceptAndPay}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-md shadow-emerald-500/30"
                  size="sm"
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Accept & Pay
                </Button>
                <Button onClick={onChat} variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Negotiate {bid.messageCount > 0 && <span className="ml-1 text-xs text-slate-500">({bid.messageCount})</span>}
                </Button>
              </>
            )}
            {savingsPct > 0 && !isAccepted && (
              <p className="text-[10px] text-emerald-600 text-center">
                <TrendingDown className="h-3 w-3 inline" /> {savingsPct}% under budget
              </p>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggleExpand}
          className="w-full px-5 py-2 border-t border-slate-100 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {expanded ? <>Hide details <ChevronUp className="h-3 w-3" /></> : <>Show full quote <ChevronDown className="h-3 w-3" /></>}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5 space-y-5 text-sm">
            {/* Cost breakdown */}
            {(bid.laborCost !== null || bid.materialsCost !== null) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Cost Breakdown</p>
                <div className="grid grid-cols-3 gap-3">
                  {bid.laborCost !== null && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><Wrench className="h-3 w-3" />Labor</p>
                      <p className="font-bold text-slate-900">${bid.laborCost.toLocaleString()}</p>
                    </div>
                  )}
                  {bid.materialsCost !== null && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><Package className="h-3 w-3" />Materials</p>
                      <p className="font-bold text-slate-900">${bid.materialsCost.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <p className="text-[10px] text-emerald-700">Total</p>
                    <p className="font-bold text-emerald-900">${bid.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {bid.proposedStartDate && (
                <DetailItem icon={Calendar} label="Start" value={new Date(bid.proposedStartDate).toLocaleDateString()} />
              )}
              {bid.estimatedCompletionDate && (
                <DetailItem icon={CheckCircle2} label="Complete by" value={new Date(bid.estimatedCompletionDate).toLocaleDateString()} />
              )}
              {bid.estimatedHours !== null && (
                <DetailItem icon={Clock} label="Hours" value={`${bid.estimatedHours}h`} />
              )}
              {bid.warrantyDays !== null && (
                <DetailItem icon={Shield} label="Warranty" value={`${bid.warrantyDays} days`} />
              )}
            </div>

            {/* Scope */}
            {(bid.inclusions.length > 0 || bid.exclusions.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {bid.inclusions.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" />What&apos;s Included
                    </p>
                    <ul className="space-y-1">
                      {bid.inclusions.map((it, i) => (
                        <li key={i} className="text-slate-700 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">•</span>{it}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {bid.exclusions.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1.5">
                      <XIcon className="h-3 w-3" />Not Included
                    </p>
                    <ul className="space-y-1">
                      {bid.exclusions.map((it, i) => (
                        <li key={i} className="text-slate-700 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5">•</span>{it}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Terms */}
            {(bid.paymentTerms || bid.validUntil || bid.willPullPermits !== null) && (
              <div className="flex flex-wrap gap-1.5">
                {bid.paymentTerms && (
                  <Badge variant="outline" className="bg-white text-xs">
                    <DollarSign className="h-3 w-3 mr-0.5" />{bid.paymentTerms}
                  </Badge>
                )}
                {bid.validUntil && (
                  <Badge variant="outline" className="bg-white text-xs">
                    <Timer className="h-3 w-3 mr-0.5" />Valid until {new Date(bid.validUntil).toLocaleDateString()}
                  </Badge>
                )}
                {bid.willPullPermits === true && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    <FileCheck className="h-3 w-3 mr-0.5" />Pulls permits
                  </Badge>
                )}
                {bid.willPullPermits === false && (
                  <Badge variant="outline" className="bg-slate-50 text-xs">No permits</Badge>
                )}
              </div>
            )}

            {/* Cover letter */}
            {bid.message && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-1">Cover Letter</p>
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{bid.message}</p>
              </div>
            )}

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200">
              Submitted {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`font-bold ${highlight ? 'text-emerald-600 text-lg' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-2 border border-slate-200">
      <p className="text-[10px] text-slate-500 flex items-center gap-1"><Icon className="h-3 w-3" />{label}</p>
      <p className="font-semibold text-slate-900 text-xs">{value}</p>
    </div>
  );
}

/* ──────────── Stripe Elements payment form ──────────── */
function PaymentForm({
  amount, onSuccess, onCancel,
}: { amount: number; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // We use redirect: 'if_required' so we stay on-page if 3DS is not needed
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      toast({
        title: 'Payment failed',
        description: confirmError.message || 'Please check your card details and try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2 flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 shadow-md shadow-emerald-500/30"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
          ) : (
            <><Lock className="h-4 w-4 mr-2" />Fund ${amount.toLocaleString()}</>
          )}
        </Button>
      </div>
    </form>
  );
}
