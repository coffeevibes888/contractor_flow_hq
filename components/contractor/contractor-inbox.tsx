'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Send,
  Loader2,
  User,
  ArrowLeft,
  Circle,
} from 'lucide-react';
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

export function ContractorInbox({ userId }: { userId: string }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  // Fetch threads
  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/contractor/chat/threads');
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    // Poll threads every 15 seconds
    const interval = setInterval(fetchThreads, 15000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  // Fetch messages for selected thread
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
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (selectedThreadId) {
      setLoadingMessages(true);
      fetchMessages();
      // Poll messages every 5 seconds when a thread is open
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchMessages, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedThreadId, fetchMessages]);

  // Scroll to bottom
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

  // Mobile: show thread list or chat
  const showChat = !!selectedThreadId;

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-220px)] lg:h-[650px]">
        {/* Thread List */}
        <div
          className={`lg:col-span-1 border-r border-gray-200 flex flex-col ${
            showChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingThreads ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No messages yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Messages from customers will appear here
                </p>
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedThreadId === thread.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      {thread.otherUser?.image ? (
                        <img
                          src={thread.otherUser.image}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                      {thread.isUnread && (
                        <Circle className="absolute -top-0.5 -right-0.5 h-3 w-3 fill-blue-500 text-blue-500" />
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
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatDistanceToNow(
                              new Date(thread.lastMessage.createdAt),
                              { addSuffix: true }
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
        </div>

        {/* Chat Area */}
        <div
          className={`lg:col-span-2 flex flex-col ${
            showChat ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center gap-3">
                <button
                  onClick={() => setSelectedThreadId(null)}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded flex-shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {selectedThread.otherUser?.image ? (
                  <img
                    src={selectedThread.otherUser.image}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {selectedThread.otherUser?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedThread.otherUser?.email}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">
                      No messages in this conversation yet
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
                          className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 break-words ${
                            isMe
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isMe ? 'text-white/60' : 'text-gray-400'
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0"
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
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-gray-200 mb-4" />
                <p className="text-gray-500">Select a conversation</p>
                <p className="text-gray-400 text-sm mt-1">
                  Choose a thread from the left to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
