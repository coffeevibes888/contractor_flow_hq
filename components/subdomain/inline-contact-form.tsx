'use client';

/**
 * InlineContactForm — lightweight version of the contact form used inline
 * on the property page. Posts to the same `/api/messages/contact` endpoint
 * as the standalone contact page so backend behavior (lead routing, team
 * notifications) is identical.
 *
 * Theming: white card, subtle slate borders, blue/black gradient submit
 * button. Pairs with the new property-detail layout.
 */

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface InlineContactFormProps {
  brandName: string;
  subdomain: string;
  /** Optional: pre-fills the subject line from the property page. */
  defaultSubject?: string;
}

export default function InlineContactForm({
  brandName,
  subdomain,
  defaultSubject,
}: InlineContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [message, setMessage] = useState('');
  const [inquiryType, setInquiryType] = useState('rental');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name || !email || !message) {
      setError('Please fill in your name, email, and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/messages/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          projectType: inquiryType,
          message,
          subdomain,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setSubject(defaultSubject ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white shadow-2xl border border-slate-100 p-5 sm:p-6 md:p-8">
      <header className="space-y-1 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent">
          Contact {brandName}
        </h2>
        <p className="text-sm text-slate-600">
          Have a question about this property? Send a note and we'll get back to you.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Field label="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              className={inputClass}
            />
          </Field>
          <Field label="Inquiry type">
            <select
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className={inputClass}
            >
              <option value="rental">Interested in renting</option>
              <option value="tour">Schedule a tour</option>
              <option value="maintenance">Maintenance request</option>
              <option value="general">General question</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>

        <Field label="Message">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us how we can help…"
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
          <p className="text-[11px] leading-relaxed text-slate-500 max-w-xs">
            By sending this message you agree to be contacted regarding your inquiry.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-slate-800 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>Send message</>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Message sent — we'll be in touch within 24-48 hours.
          </p>
        )}
      </form>
    </section>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-[0.16em] text-slate-600">{label}</label>
      {children}
    </div>
  );
}
