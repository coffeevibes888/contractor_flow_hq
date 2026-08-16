'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { MessageSquare, Mail, Clock, ArrowRight } from 'lucide-react';

const HomeContactCard = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Treat both /?for=contractor and /contractor as the contractor side.
  const isContractor =
    searchParams.get('for') === 'contractor' || pathname?.startsWith('/contractor');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
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
        body: JSON.stringify({ name, email, message }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }

      setSuccess('Message sent! We\'ll get back to you within 24 hours.');
      setName('');
      setEmail('');
      setMessage('');
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
    <section className="w-full py-16 md:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div
          className={`rounded-3xl border border-black shadow-2xl p-8 md:p-10 grid gap-8 md:grid-cols-[1.4fr_1fr] ${
            isContractor
              ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500'
              : 'bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600'
          }`}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Have Questions? We're Here to Help
              </h2>
              <p className="text-white font-semibold text-sm md:text-base">
                Whether you're wondering about features, need setup help, or just want to chat about property management, we'd love to hear from you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-white">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-black bg-white px-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-white">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-black bg-white px-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-white">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-black bg-white px-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 text-white px-6 py-2.5 text-sm font-bold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                  {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </button>
                <Link
                  href="/contact"
                  className="text-sm text-white font-bold hover:text-emerald-200 underline transition-colors"
                >
                  Go to full contact page
                </Link>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/20 border border-red-300 px-4 py-2 text-sm text-white font-semibold">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-500/20 border border-emerald-300 px-4 py-2 text-sm text-white font-semibold">
                  {success}
                </div>
              )}
            </form>
          </div>

          <aside className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-white">Quick Info</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <Clock className="h-5 w-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white text-sm">Response Time</div>
                    <div className="text-xs text-white/90 font-semibold">Usually within 24 hours</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <Mail className="h-5 w-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white text-sm">Email Support</div>
                    <div className="text-xs text-white/90 font-semibold break-all">support@propertyflowhq.com</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                  <MessageSquare className="h-5 w-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white text-sm">Live Chat</div>
                    <div className="text-xs text-white/90 font-semibold">Available in your dashboard</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-300/50 backdrop-blur-sm">
              <p className="text-xs text-white leading-relaxed font-semibold">
                <span className="font-bold">Pro Tip:</span> Most questions are answered in our help center. Check it out before reaching out!
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default HomeContactCard;
