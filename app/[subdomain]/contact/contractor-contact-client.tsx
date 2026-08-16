'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, User, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ContractorContactClientProps {
  businessName: string;
  displayName: string;
  email: string;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  profilePhoto: string | null;
  baseCity: string | null;
  baseState: string | null;
  specialties: string[];
  isAvailable: boolean;
  availabilityNotes: string | null;
  subdomain: string;
  contractorId: string;
}

export default function ContractorContactClient({
  businessName,
  displayName,
  email,
  phone,
  website,
  logoUrl,
  profilePhoto,
  baseCity,
  baseState,
  specialties,
  isAvailable,
  availabilityNotes,
  subdomain,
  contractorId,
}: ContractorContactClientProps) {
  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [projectType, setProjectType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const displayPhoto = profilePhoto || logoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !senderEmail || !message) {
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
          email: senderEmail,
          subject,
          projectType,
          message,
          subdomain,
          entityType: 'contractor',
          contractorId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }

      setSuccess("Message sent! We'll get back to you within 24-48 hours.");
      setName('');
      setSenderEmail('');
      setSubject('');
      setMessage('');
      setProjectType('');
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
      {displayPhoto && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
          <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px]">
            <Image
              src={displayPhoto}
              alt={`${businessName} watermark`}
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
                  Request a Quote
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white">
                  Contact <span className="bg-gradient-to-r from-white via-cyan-100 to-sky-200 bg-clip-text text-transparent">{businessName}</span>
                </h1>
                <p className="text-sm sm:text-base text-white/80 max-w-xl">
                  Have a project in mind? Need a quote? We&apos;d love to hear from you.
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
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
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
                      Project Type
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    >
                      <option value="" className="bg-slate-800 text-white">
                        Select project type
                      </option>
                      <option value="repair" className="bg-slate-800 text-white">
                        Repair / Fix
                      </option>
                      <option value="installation" className="bg-slate-800 text-white">
                        New Installation
                      </option>
                      <option value="renovation" className="bg-slate-800 text-white">
                        Renovation / Remodel
                      </option>
                      <option value="maintenance" className="bg-slate-800 text-white">
                        Maintenance
                      </option>
                      <option value="inspection" className="bg-slate-800 text-white">
                        Inspection / Assessment
                      </option>
                      <option value="emergency" className="bg-slate-800 text-white">
                        Emergency Service
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
                    placeholder="Describe your project or what you need help with..."
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
                  {displayPhoto ? (
                    <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-white/10 shadow-lg">
                      <Image
                        src={displayPhoto}
                        alt={`${businessName}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg">
                      <User className="h-7 w-7" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {businessName}
                    </p>
                    <p className="text-xs text-white/70">{displayName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-white/90">
                    Professional contractor services with quality workmanship and reliable service. Contact us for a free quote on your next project.
                  </p>
                </div>

                {/* Specialties */}
                {specialties.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Services
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {specialties.slice(0, 5).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs bg-white/10 text-white/80 border-white/20">
                          {s}
                        </Badge>
                      ))}
                      {specialties.length > 5 && (
                        <Badge variant="secondary" className="text-xs bg-white/10 text-white/80 border-white/20">
                          +{specialties.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {email && (
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        Email
                      </p>
                      <p className="mt-1 font-medium break-all">{email}</p>
                    </div>
                  )}

                  {phone && (
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        Phone
                      </p>
                      <p className="mt-1 font-medium">{phone}</p>
                    </div>
                  )}

                  {(baseCity || baseState) && (
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location
                      </p>
                      <p className="mt-1">{[baseCity, baseState].filter(Boolean).join(', ')}</p>
                    </div>
                  )}

                  {website && (
                    <div className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-3 text-xs text-white/90">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        Website
                      </p>
                      <a 
                        href={website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 font-medium text-cyan-300 hover:text-cyan-200 break-all"
                      >
                        {website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mt-6 flex items-center justify-between gap-3 text-[11px] text-white/70">
                <p className="max-w-[70%]">
                  Get a free quote for your project today.
                </p>
                <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-medium tracking-wide ring-1 ${
                  isAvailable 
                    ? 'bg-white/10 text-emerald-200 ring-emerald-400/40' 
                    : 'bg-white/10 text-amber-200 ring-amber-400/40'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    isAvailable 
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' 
                      : 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                  }`} />
                  <span>{isAvailable ? 'Available' : 'Busy'}</span>
                </div>
              </div>
              {availabilityNotes && (
                <p className="text-[10px] text-white/60 mt-2">{availabilityNotes}</p>
              )}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
