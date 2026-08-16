'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare, Send, DollarSign, Sparkles, Check, X as XIcon,
  Loader2, Clock, Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ThreadMessage {
  id: string;
  type: string;
  body: string | null;
  counterAmount: string | null;
  counterStatus: string | null;
  senderId: string;
  sender: { id: string; name: string; image: string | null };
  createdAt: string;
  respondedAt: string | null;
}

interface BidMessageThreadProps {
  workOrderId: string;
  bidId: string;
  currentUserId: string;
  /** label of the other party shown in the header, e.g. "the property manager" */
  otherPartyLabel: string;
}

export default function BidMessageThread({
  workOrderId,
  bidId,
  currentUserId,
  otherPartyLabel,
}: BidMessageThreadProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/bid/${bidId}/messages`);
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    } catch (e) {
      console.error('load messages', e);
    } finally {
      setLoading(false);
    }
  }, [workOrderId, bidId]);

  useEffect(() => {
    loadMessages();
    // Light polling — replace with websocket later
    const t = setInterval(loadMessages, 8000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    // auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/bid/${bidId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'message', body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setText('');
      await loadMessages();
    } catch (e) {
      toast({
        title: 'Could not send',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const sendCounter = async () => {
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      toast({ title: 'Enter an amount', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/bid/${bidId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'counter_offer',
          counterAmount: parseFloat(counterAmount),
          body: counterNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setCounterAmount('');
      setCounterNote('');
      setCounterOpen(false);
      toast({ title: 'Counter-offer sent' });
      await loadMessages();
    } catch (e) {
      toast({
        title: 'Could not send counter',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const respondToCounter = async (msgId: string, action: 'accept' | 'reject') => {
    setRespondingId(msgId);
    try {
      const res = await fetch(
        `/api/work-orders/${workOrderId}/bid/${bidId}/messages/${msgId}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      toast({ title: action === 'accept' ? 'Counter-offer accepted!' : 'Counter-offer rejected' });
      await loadMessages();
    } catch (e) {
      toast({
        title: 'Action failed',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <Card className="border-blue-200 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span>Negotiation</span>
          <Badge variant="outline" className="ml-auto text-xs font-normal bg-white">
            with {otherPartyLabel}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages */}
        <div ref={scrollRef} className="max-h-[420px] min-h-[180px] overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs mt-1">Send a message or counter-offer to start the conversation.</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === currentUserId;
              if (m.type === 'system') {
                return (
                  <div key={m.id} className="flex items-center justify-center my-2">
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
                      <Info className="h-3 w-3" />
                      {m.body}
                    </div>
                  </div>
                );
              }
              if (m.type === 'counter_offer') {
                const status = m.counterStatus || 'pending';
                const amount = m.counterAmount ? Number(m.counterAmount).toLocaleString() : '0';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl border-2 ${
                        status === 'accepted'
                          ? 'border-emerald-300 bg-emerald-50'
                          : status === 'rejected' || status === 'superseded'
                            ? 'border-slate-200 bg-slate-50 opacity-70'
                            : mine
                              ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50'
                              : 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50'
                      } p-4 shadow-sm`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className={`h-4 w-4 ${mine ? 'text-blue-600' : 'text-amber-600'}`} />
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                          {mine ? 'You sent a counter-offer' : 'Counter-offer'}
                        </span>
                      </div>
                      <p className="text-2xl font-black text-slate-900 mb-1">
                        ${amount}
                      </p>
                      {m.body && (
                        <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">{m.body}</p>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {status === 'pending' && (
                          <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                            <Clock className="h-3 w-3 mr-1" />Awaiting response
                          </Badge>
                        )}
                        {status === 'accepted' && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                            <Check className="h-3 w-3 mr-1" />Accepted
                          </Badge>
                        )}
                        {status === 'rejected' && (
                          <Badge variant="outline" className="bg-white text-red-700 border-red-300">
                            <XIcon className="h-3 w-3 mr-1" />Rejected
                          </Badge>
                        )}
                        {status === 'superseded' && (
                          <Badge variant="outline" className="bg-white text-slate-500">
                            Superseded
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Action buttons (only opposing party, only if pending) */}
                      {!mine && status === 'pending' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-amber-200">
                          <Button
                            size="sm"
                            onClick={() => respondToCounter(m.id, 'accept')}
                            disabled={respondingId === m.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {respondingId === m.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Accept ${amount}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToCounter(m.id, 'reject')}
                            disabled={respondingId === m.id}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Plain message
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-end gap-2 max-w-[80%]">
                    {!mine && (
                      <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-xs font-semibold text-slate-600 mb-0.5">
                        {m.sender.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.sender.image} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          m.sender.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        mine
                          ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-br-md'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Separator />

        {/* Composer */}
        {counterOpen ? (
          <div className="p-4 space-y-3 bg-gradient-to-br from-amber-50 to-yellow-50 border-t-2 border-amber-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Send a Counter-Offer
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setCounterOpen(false)} className="h-7 text-slate-500">
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-9 text-base font-semibold"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Why this price? e.g., Including premium materials, expedited timeline..."
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
              />
            </div>
            <Button onClick={sendCounter} disabled={sending || !counterAmount} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Counter-Offer
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-2 bg-white">
            <div className="flex items-end gap-2">
              <Textarea
                placeholder="Type a message..."
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="resize-none min-h-[40px]"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 h-10 w-10 shrink-0"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCounterOpen(true)}
              className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Send a counter-offer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
