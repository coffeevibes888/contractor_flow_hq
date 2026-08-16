"use client";

import React from 'react';

export default function NewDmForm() {
  const [identifier, setIdentifier] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const trimmedIdentifier = identifier.trim();
    const trimmedMessage = message.trim();

    if (!trimmedIdentifier || !trimmedMessage) {
      setStatus('Please enter who you want to message and a message body.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/messages/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedIdentifier, message: trimmedMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data?.error || 'Failed to send message.');
        return;
      }

      setIdentifier('');
      setMessage('');
      setStatus('Message sent! It will appear in your conversations list.');
    } catch (error) {
      console.error('Error sending DM', error);
      setStatus('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs md:text-sm">
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-300/90">
          To (email, phone, or username)
        </label>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs md:text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/70"
          placeholder="someone@example.com or username or +1..."
        />
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-[0.18em] text-slate-300/90">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs md:text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/70 resize-none"
          placeholder="Say hi, ask a question, or start a collab..."
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-violet-500 px-4 py-2 text-xs md:text-sm font-medium text-white shadow hover:bg-violet-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending...' : 'Send message'}
      </button>
      {status && (
        <p className="text-[11px] text-slate-300/90 mt-1">{status}</p>
      )}
    </form>
  );
}
