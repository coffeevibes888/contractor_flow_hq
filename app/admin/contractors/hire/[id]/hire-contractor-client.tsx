'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, MapPin, Wrench, CheckCircle, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

interface Property {
  id: string;
  name: string;
  address: { street?: string; city?: string; state?: string } | null;
}

interface Props {
  contractorId: string;
  contractorName: string;
  contractorSpecialties: string[];
  contractorPhoto: string | null;
  contractorLocation: string | null;
  avgRating: number | null;
  totalReviews: number | null;
  completedJobs: number | null;
  properties: Property[];
}

export default function HireContractorClient({
  contractorId,
  contractorName,
  contractorSpecialties,
  contractorPhoto,
  contractorLocation,
  avgRating,
  totalReviews,
  completedJobs,
  properties,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: '',
    title: '',
    description: '',
    priority: 'medium',
    agreedPrice: '',
    scheduledDate: '',
    notes: '',
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyId) {
      toast.error('Please select a property.');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Please enter a job title.');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Please describe the job.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorId,
          propertyId: form.propertyId,
          title: form.title,
          description: form.description,
          priority: form.priority,
          agreedPrice: form.agreedPrice ? parseFloat(form.agreedPrice) : undefined,
          scheduledDate: form.scheduledDate || undefined,
          notes: form.notes || undefined,
          isOpenBid: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create work order');
      }

      toast.success('Job offer sent! Work order created and assigned.');
      router.push(`/admin/contractors`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link
        href="/contractor-marketplace"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contractors
      </Link>

      {/* Contractor Summary Card */}
      <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
          {contractorPhoto ? (
            <img src={contractorPhoto} alt={contractorName} className="w-full h-full object-cover" />
          ) : (
            contractorName.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{contractorName}</h2>
          {contractorSpecialties.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">{contractorSpecialties.join(' · ')}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            {avgRating !== null && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)}
                {totalReviews !== null && ` (${totalReviews} reviews)`}
              </span>
            )}
            {completedJobs !== null && (
              <span className="flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5" />
                {completedJobs} jobs completed
              </span>
            )}
            {contractorLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {contractorLocation}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-xs font-semibold text-cyan-700">
            <Send className="h-3 w-3" />
            Sending Job Offer
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Job Details</h3>
          <p className="text-sm text-slate-500">
            Fill in the details below. This will create a work order assigned directly to{' '}
            <span className="font-medium text-slate-700">{contractorName}</span>.
          </p>
        </div>

        {/* Property */}
        <div>
          <label className={labelCls}>Property *</label>
          {properties.length === 0 ? (
            <p className="text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              You have no properties yet.{' '}
              <Link href="/admin/dashboard/properties/new" className="underline font-medium">
                Add a property first.
              </Link>
            </p>
          ) : (
            <select
              value={form.propertyId}
              onChange={(e) => set('propertyId', e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select a property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.address?.city ? ` — ${p.address.city}, ${p.address.state ?? ''}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Title */}
        <div>
          <label className={labelCls}>Job Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Interior painting — Unit 2B"
            required
            className={inputCls}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the work needed, scope, materials, expectations…"
            rows={4}
            required
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Priority + Agreed Price row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
              className={inputCls}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Agreed Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.agreedPrice}
              onChange={(e) => set('agreedPrice', e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </div>
        </div>

        {/* Scheduled Date */}
        <div>
          <label className={labelCls}>Scheduled Date</label>
          <input
            type="date"
            value={form.scheduledDate}
            onChange={(e) => set('scheduledDate', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Additional Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any special instructions, access info, etc."
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Info callout */}
        <div className="flex items-start gap-3 rounded-xl bg-cyan-50 border border-cyan-200 px-4 py-3 text-sm text-cyan-800">
          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-500" />
          <span>
            The work order will be created with status <strong>Assigned</strong> and{' '}
            <strong>{contractorName}</strong> will be notified immediately.
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting || properties.length === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-8 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Offer…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Job Offer
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="w-full sm:w-auto text-slate-500"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
