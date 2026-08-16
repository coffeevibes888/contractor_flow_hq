'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  content: string;
  senderUserId: string;
  senderName: string;
  senderImage?: string;
  createdAt: string;
}

interface JobChatWidgetProps {
  jobId: string;
  jobTitle: string;
  currentUser: {
    id: string;
    name: string;
    image?: string | null;
  };
  otherParty: {
    id: string;
    name: string;
    image?: string | null;
    role: 'homeowner' | 'contractor';
  };
}

export function JobChatWidget({
  jobId,
  jobTitle,
  currentUser,
  otherParty,
}: JobChatWidgetProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load or create thread
  useEffect(() => {
    const loadThread = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/jobs/${jobId}/thread`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            otherPartyId: otherParty.id,
          }),
        });

        const data = await res.json();

        if (data.success && data.thread) {
          setThreadId(data.thread.id);
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error loading thread:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && !threadId) {
      loadThread();
    }
  }, [isOpen, jobId, otherParty.id, threadId]);

  // Poll for new messages
  useEffect(() => {
    if (!isOpen || !threadId) return;

    const pollMessages = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/messages?threadId=${threadId}`);
        const data = await res.json();

        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    // Poll every 5 seconds when chat is open
    const interval = setInterval(pollMessages, 5000);

    return () => clearInterval(interval);
  }, [isOpen, threadId, jobId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for unread messages when closed
  useEffect(() => {
    if (isOpen || !threadId) return;

    const checkUnread = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/messages/unread?threadId=${threadId}`);
        const data = await res.json();

        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error checking unread:', error);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOpen, threadId, jobId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          content,
        }),
      });

      const data = await res.json();

      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setInput(content); // Restore input
    } finally {
      setIsSending(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      {/* Floating Button */}
      {(!isOpen || isMinimized) && (
        <Button
          onClick={handleOpen}
          data-job-chat-trigger
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 p-0"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <Card className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] shadow-2xl border-white/20 bg-white/95 backdrop-blur-sm flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-purple-600">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                {otherParty.image ? (
                  <img
                    src={otherParty.image}
                    alt={otherParty.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  otherParty.name[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm truncate">
                  {otherParty.name}
                </h3>
                <p className="text-xs text-white/80 truncate">{jobTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-600 font-medium">No messages yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Start the conversation about this job
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isOwn = message.senderUserId === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-900'
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1 text-slate-600">
                            {message.senderName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-white/70' : 'text-slate-500'
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isSending || isLoading}
                className="flex-1 border-slate-300 focus:border-violet-500"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isSending || isLoading}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
