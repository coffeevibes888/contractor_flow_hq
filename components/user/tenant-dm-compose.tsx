"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type TenantContact = {
  userId: string;
  name: string;
  role: string; // e.g. "Landlord", "Property Manager", "Team Member"
};

interface TenantDMComposeProps {
  contacts: TenantContact[];
  prefillToId?: string;
}

export default function TenantDMCompose({ contacts, prefillToId }: TenantDMComposeProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState(
    prefillToId && contacts.some((c) => c.userId === prefillToId)
      ? prefillToId
      : (contacts[0]?.userId ?? '')
  );
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError('Please select a recipient.');
      return;
    }
    if (!message.trim()) {
      setError('Message cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/messages/dm/by-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: selectedUserId,
          message: message.trim(),
          subject: subject.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.threadId) {
        setError(data.error || 'Failed to send message.');
        return;
      }

      router.push(`/user/profile/inbox/${data.threadId}`);
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No contacts available yet.</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Once you have an active lease, your property manager and landlord will appear here.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      {/* To */}
      <div className="flex items-center gap-3 border-b border-gray-100 py-3">
        <span className="text-xs font-semibold text-gray-500 w-16 flex-shrink-0">To</span>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          required
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 font-medium focus:outline-none"
        >
          <option value="" disabled>Select a recipient...</option>
          {contacts.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.name} — {c.role}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div className="flex items-center gap-3 border-b border-gray-100 py-3">
        <span className="text-xs font-semibold text-gray-500 w-16 flex-shrink-0">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Message subject"
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none"
        />
      </div>

      {/* Body */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={10}
        required
        placeholder="Write your message..."
        className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none py-4 min-h-[200px]"
      />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 mb-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold px-5 py-2.5 shadow-md hover:shadow-lg transition-all disabled:opacity-60"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          {isSubmitting ? 'Sending…' : 'Send Message'}
        </button>
      </div>
    </form>
  );
}
