'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  senderRole: 'applicant' | 'employer' | 'system';
  content: string;
  createdAt: string;
}

interface Props {
  applicantId: string;
  role: 'applicant' | 'employer';
}

export function ApplicantMessageThread({ applicantId, role }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/jobs/applicants/${applicantId}/messages`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.messages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [applicantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await fetch(`/api/jobs/applicants/${applicantId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, data.message]);
        setContent('');
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-h-96 overflow-y-auto space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((m) => {
            const isSystem = m.senderRole === 'system';
            const isMine = m.senderRole === role;
            return (
              <div
                key={m.id}
                className={`flex ${isSystem ? 'justify-center' : isMine ? 'justify-end' : 'justify-start'}`}
              >
                {isSystem ? (
                  <div className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1 rounded-full">
                    {m.content}
                  </div>
                ) : (
                  <div
                    className={`max-w-[75%] rounded-lg p-2.5 ${
                      isMine
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message..."
          rows={2}
          className="resize-none"
        />
        <Button
          onClick={send}
          disabled={sending || !content.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 self-end"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
