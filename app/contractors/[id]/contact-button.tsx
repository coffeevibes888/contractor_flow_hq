'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2, Send, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  senderUserId: string | null;
  senderName: string | null;
  createdAt: string;
}

interface ContactContractorButtonProps {
  contractorId: string;
  contractorName: string;
  contractorUserId?: string;
}

export default function ContactContractorButton({ 
  contractorId, 
  contractorName,
  contractorUserId 
}: ContactContractorButtonProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for existing thread when dialog opens
  useEffect(() => {
    if (open && session?.user?.id) {
      checkExistingThread();
    }
  }, [open, session?.user?.id]);

  // Poll for new messages when thread exists
  useEffect(() => {
    if (!threadId || !open) return;
    
    // Poll every 10 seconds instead of 3 to reduce CPU usage
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [threadId, open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkExistingThread = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contractor/chat/thread?contractorId=${contractorId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.threadId) {
          setThreadId(data.threadId);
          setMessages(data.messages || []);
        }
      }
    } catch (error) {
      console.error('Error checking thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!threadId) return;
    try {
      const res = await fetch(`/api/contractor/chat/messages?threadId=${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/contractor/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contractorId, 
          message: message.trim(),
          threadId 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.threadId && !threadId) {
          setThreadId(data.threadId);
        }
        setMessage('');
        fetchMessages();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Not logged in
  if (status === 'unauthenticated') {
    return (
      <div className="space-y-2">
        <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90" asChild>
          <Link href={`/sign-in?callbackUrl=/contractors/${contractorId}`}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Sign in to Contact
          </Link>
        </Button>
        <p className="text-center text-xs text-slate-500">
          <Link href={`/sign-up?role=homeowner&callbackUrl=/contractors/${contractorId}`} className="text-blue-600 hover:underline">
            Create a free account
          </Link>
          {' '}to message contractors
        </p>
      </div>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Message {contractorName.split(' ')[0]}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">
                  {contractorName.charAt(0)}
                </div>
                {contractorName}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">Start a conversation with {contractorName}</p>
                <p className="text-slate-400 text-xs mt-1">Messages are private between you and the contractor</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isMe = msg.senderUserId === session?.user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isMe
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="px-4 py-3 border-t bg-white">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <Button 
                onClick={handleSend} 
                disabled={sending || !message.trim()}
                size="icon"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 rounded-xl"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
