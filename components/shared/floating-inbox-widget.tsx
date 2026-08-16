'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  User,
  ArrowLeft,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ThreadUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface ThreadSummary {
  id: string;
  subject: string | null;
  updatedAt: string;
  otherUser: ThreadUser | null;
  lastMessage: {
    id: string;
    content: string;
    senderUserId: string | null;
    createdAt: string;
  } | null;
  isUnread: boolean;
}

interface Message {
  id: string;
  content: string;
  senderUserId: string | null;
  senderName: string | null;
  createdAt: string;
}

export function FloatingInboxWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const userId = session?.user?.id;
  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const unreadCount = threads.filter((t) => t.isUnread).length;

  // Load online status from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chat-online-status');
    if (saved !== null) setIsOnline(saved === 'true');
  }, []);

  const toggleOnline = (value: boolean) => {
    setIsOnline(value);
    localStorage.setItem('chat-online-status', String(value));
  };

  // Fetch threads
  const fetchThreads = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/contractor/chat/threads');
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingThreads(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchThreads();
    const interval = setInterval(fetchThreads, 15000);
    return () => clearInterval(interval);
  }, [userId, fetchThreads]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!selectedThreadId) return;
    try {
      const res = await fetch(
        `/api/contractor/chat/messages?threadId=${selectedThreadId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (selectedThreadId) {
      setLoadingMessages(true);
      fetchMessages();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchMessages, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedThreadId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedThreadId) return;
    setSending(true);
    try {
      const res = await fetch('/api/contractor/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          threadId: selectedThreadId,
          recipientUserId: selectedThread?.otherUser?.id,
        }),
      });
      if (res.ok) {
        setNewMessage('');
        fetchMessages();
        fetchThreads();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!userId) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 shadow-xl flex items-center justify-center text-white hover:shadow-blue-500/40 transition-shadow"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOpen(false);
                setSelectedThreadId(null);
              }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-4 right-4 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-[550px] bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-500">
                <div className="flex items-center gap-3">
                  {selectedThreadId && (
                    <button
                      onClick={() => setSelectedThreadId(null)}
                      className="p-1 hover:bg-white/20 rounded text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <h3 className="text-white font-semibold text-sm">
                    {selectedThread
                      ? selectedThread.otherUser?.name || 'Chat'
                      : 'Messages'}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {/* Online/Offline Toggle */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/80 text-xs">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                    <Switch
                      checked={isOnline}
                      onCheckedChange={toggleOnline}
                      className="data-[state=checked]:bg-emerald-400 data-[state=unchecked]:bg-white/30 h-5 w-9"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedThreadId(null);
                    }}
                    className="p-1 hover:bg-white/20 rounded text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {!selectedThreadId ? (
                /* Thread List */
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {loadingThreads ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <MessageCircle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm">No messages yet</p>
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            {thread.otherUser?.image ? (
                              <img
                                src={thread.otherUser.image}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            {thread.isUnread && (
                              <Circle className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 fill-blue-500 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-sm truncate ${
                                  thread.isUnread
                                    ? 'font-semibold text-gray-900'
                                    : 'font-medium text-gray-700'
                                }`}
                              >
                                {thread.otherUser?.name || 'Unknown'}
                              </p>
                              {thread.lastMessage && (
                                <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                                  {formatDistanceToNow(
                                    new Date(thread.lastMessage.createdAt),
                                    { addSuffix: false }
                                  )}
                                </span>
                              )}
                            </div>
                            {thread.lastMessage && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {thread.lastMessage.senderUserId === userId
                                  ? 'You: '
                                  : ''}
                                {thread.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                /* Chat View */
                <>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">
                          Start the conversation
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderUserId === userId;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                                isMe
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {msg.content}
                              </p>
                              <p
                                className={`text-[10px] mt-0.5 text-right ${
                                  isMe ? 'text-white/60' : 'text-gray-400'
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={sending || !newMessage.trim()}
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
