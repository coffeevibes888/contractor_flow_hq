'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface SubdomainContactClientProps {
  brandName: string;
  brandEmail: string | null;
  brandPhone: string | null;
  brandAddress: string | null;
  logoUrl: string | null;
  subdomain: string;
}

export default function SubdomainContactClient({
  brandName,
  brandEmail,
  brandPhone,
  brandAddress,
  logoUrl,
  subdomain,
}: SubdomainContactClientProps) {
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
          subdomain,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }

      setSuccess("Message sent! We'll get back to you within 24-48 hours.");
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
    <main className="relative min-h-[calc(100vh-4rem)] w-full flex items-center justify-center px-4 py-10">
      {/* Logo watermark in the background */}
      {logoUrl && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
          <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px]">
            <Image
              src={logoUrl}
              alt={`${brandName} logo watermark`}
              fill
              className="object-contain drop-shadow-[0_0_45px_rgba(129,140,248,0.6)]"
              priority
            />
          </div>
        </div>
      )}
      <div className="relative w-full max-w-5xl bg-gradient-to-r from-blue-700 to-indigo-800">
        {/* Glass card */}
        <div className="relative rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm overflow-hidden">
          <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)] p-6 sm:p-8 lg:p-10">
            {/* Form side */}
            <section className="space-y-6">
              <header className="space-y-2">
                <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/80 ring-1 ring-white/20">
                  We&apos;re here to help
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white">
                  Contact <span className="bg-gradient-to-r from-white via-cyan-100 to-sky-200 bg-clip-text text-transparent">{brandName}</span>
                </h1>
                <p className="text-sm sm:text-base text-white/80 max-w-xl">
                  Have questions about our properties or services? Looking to rent? We&apos;d love to hear from you.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20 placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20 placeholder:text-white/50"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20 placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                      Inquiry Type
                    </label>
                    <select
                      value={inquiryType}
                      onChange={(e) => setInquiryType(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    >
                      <option value="" className="bg-slate-800 text-white">
                        Select an option
                      </option>
                      <option value="rental" className="bg-slate-800 text-white">
                        Interested in renting
                      </option>
                      <option value="tour" className="bg-slate-800 text-white">
                        Schedule a tour
                      </option>
                      <option value="maintenance" className="bg-slate-800 text-white">
                        Maintenance request
                      </option>
                      <option value="general" className="bg-slate-800 text-white">
                        General question
                      </option>
                      <option value="other" className="bg-slate-800 text-white">
                        Other
                      </option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us how we can help you..."
                    rows={5}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20 placeholder:text-white/50 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] leading-relaxed text-white/70 max-w-xs">
                    By sending this message you agree to be contacted regarding your inquiry.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Sending...' : 'Send message'}
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-rose-100 bg-rose-500/30 border border-rose-300/40 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-xs text-emerald-100 bg-emerald-500/30 border border-emerald-300/40 rounded-lg px-3 py-2">
                    {success}
                  </p>
                )}
              </form>
            </section>

            {/* Overview / profile side */}
            <aside className="relative flex flex-col justify-between rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm px-5 py-6 sm:px-6 lg:px-7 lg:py-8 overflow-hidden">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-[-3rem] h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative space-y-5">
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-white/10 shadow-lg">
                      <Image
                        src={logoUrl}
                        alt={`${brandName} logo`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white font-bold text-xl shadow-lg">
                      {brandName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">
                      {brandName}
                    </p>
                    <p className="text-sm text-white/90">Property Management</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-white/90">
                    We manage quality rental properties with care, transparency, and responsive service. Contact us for any questions about our available units.
                  </p>
                  <p className="text-xs text-white/70">
                    Expect a response within 24-48 hours. For urgent matters, please call or email us directly.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {brandEmail && (
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        Email
                      </p>
                      <p className="mt-1 font-medium break-all">{brandEmail}</p>
                    </div>
                  )}

                  {brandPhone && (
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        Phone
                      </p>
                      <p className="mt-1 font-medium">{brandPhone}</p>
                    </div>
                  )}

                  {brandAddress && (
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        Location
                      </p>
                      <p className="mt-1">{brandAddress}</p>
                    </div>
                  )}

                  <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                      Hours
                    </p>
                    <p className="mt-1">Mon-Fri 9am-6pm</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 flex items-center justify-between gap-3 text-[11px] text-white/70">
                <p className="max-w-[70%]">
                  Browse our available properties and apply online today.
                </p>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-emerald-200 ring-1 ring-emerald-400/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                  <span>Now leasing</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
