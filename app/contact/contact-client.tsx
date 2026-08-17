'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

const ContactClient = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }

      setSuccess('Message sent! We\'ll get back to you within 24-48 hours.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setInquiryType('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while sending your message. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50 flex items-center justify-center px-4 py-10">
      {/* Logo watermark in the background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
        <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px]">
          <Image
            src="/images/logo.svg"
            alt={`${APP_NAME} logo watermark`}
            fill
            className="object-contain drop-shadow-[0_0_45px_rgba(244,63,94,0.4)]"
            priority
          />
        </div>
      </div>
      <div className="relative w-full max-w-5xl">
        {/* Glow */}
        <div className="pointer-events-none absolute -inset-1 rounded-3xl" />

        {/* Glass card */}
        <div className="relative rounded-3xl border overflow-hidden">
          <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)] p-6 sm:p-8 lg:p-10">
            {/* Form side */}
            <section className="space-y-6">
              <header className="space-y-2">
                <p className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-rose-200/80 ring-1 ring-white/10">
                  We&apos;re here to help
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
                  Contact <span className="bg-gradient-to-r from-rose-300 via-orange-300 to-amber-300 bg-clip-text text-transparent">{APP_NAME}</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300/80 max-w-xl">
                  Have questions about our contractor management platform? Want to grow your business? We&apos;d love to hear from you.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300/80">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-50 outline-none transition focus:border-rose-400/70 focus:ring-2 focus:ring-rose-500/40 placeholder:text-slate-400/70"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300/80">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-50 outline-none transition focus:border-rose-400/70 focus:ring-2 focus:ring-rose-500/40 placeholder:text-slate-400/70"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300/80">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-50 outline-none transition focus:border-rose-400/70 focus:ring-2 focus:ring-rose-500/40 placeholder:text-slate-400/70"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300/80">
                      Inquiry Type
                    </label>
                    <select
                      value={inquiryType}
                      onChange={(e) => setInquiryType(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-50 outline-none transition focus:border-rose-400/70 focus:ring-2 focus:ring-rose-500/40 bg-[rgba(15,23,42,0.4)]"
                    >
                      <option value="" className="bg-slate-900">
                        Select an option
                      </option>
                      <option value="contractor" className="bg-slate-900">
                        I&apos;m a contractor interested in the platform
                      </option>
                      <option value="client" className="bg-slate-900">
                        I&apos;m a client/property manager looking to hire
                      </option>
                      <option value="support" className="bg-slate-900">
                        Technical support
                      </option>
                      <option value="partnership" className="bg-slate-900">
                        Partnership / Business inquiry
                      </option>
                      <option value="other" className="bg-slate-900">
                        Other
                      </option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300/80">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us how we can help you..."
                    rows={5}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-50 outline-none transition focus:border-rose-400/70 focus:ring-2 focus:ring-rose-500/40 placeholder:text-slate-400/70 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] leading-relaxed text-slate-300/80 max-w-xs">
                    By sending this message you agree to be contacted regarding your inquiry.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Sending...' : 'Send message'}
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-rose-300 bg-rose-900/40 border border-rose-500/40 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-xs text-emerald-200 bg-emerald-900/40 border border-emerald-500/40 rounded-lg px-3 py-2">
                    {success}
                  </p>
                )}
              </form>
            </section>

            {/* Overview / profile side */}
            <aside className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-rose-900/40 px-5 py-6 sm:px-6 lg:px-7 lg:py-8 shadow-inner shadow-slate-950/60 overflow-hidden">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-[-3rem] h-40 w-40 rounded-full bg-orange-400/20 blur-3xl" />

              <div className="relative space-y-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white font-bold text-xl shadow-lg shadow-rose-500/40">
                    CF
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300/80">
                      {APP_NAME}
                    </p>
                    <p className="text-sm text-slate-100/90">Run Your Entire Business. One Platform.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-slate-200/90">
                    We help contractors run their entire operation — jobs, invoices, team scheduling, inventory, and marketing — all from one platform. No more duct-taping five apps together.
                  </p>
                  <p className="text-xs text-slate-300/75">
                    Expect a response within 24-48 hours. For urgent matters, please email us directly.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-3 text-xs text-slate-200/90">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/90">
                      Email
                    </p>
                    <p className="mt-1 font-medium break-all">
                      <a
                        href="mailto:support@contractorflowhq.com"
                        className="hover:text-rose-300 transition-colors"
                      >
                        support@contractorflowhq.com
                      </a>
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-3 text-xs text-slate-200/90">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/90">
                      Phone
                    </p>
                    <p className="mt-1 font-medium">(702) 582-7390</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-3 text-xs text-slate-200/90">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/90">
                      Location
                    </p>
                    <p className="mt-1">Las Vegas, NV</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-3 text-xs text-slate-200/90">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/90">
                      Hours
                    </p>
                    <p className="mt-1">Mon-Fri 9am-6pm PT</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 flex items-center justify-between gap-3 text-[11px] text-slate-300/80">
                <p className="max-w-[70%]">
                  Starting at $39/month. No per-job fees. Ever.
                </p>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-medium tracking-wide text-emerald-200/90 ring-1 ring-emerald-400/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                  <span>Accepting new contractors</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ContactClient;
