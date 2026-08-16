'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Send, Archive, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  senderName: string | null;
  senderEmail: string | null;
  role: string;
  createdAt: Date;
}

interface Thread {
  id: string;
  type: string;
  subject: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  unreadCount?: number;
}

interface ContractorMessagesClientProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export default function ContractorMessagesClient({
  userId,
  userName,
  userEmail,
}: ContractorMessagesClientProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'archived' | 'trash'>('inbox');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  // Load threads
  useEffect(() => {
    loadThreads();
  }, [folder]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contractor/messages?folder=${folder}`);
      const data = await res.json();
      
      if (data.success) {
        setThreads(data.threads || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/contractor/messages/${threadId}`);
      const data = await res.json();
      
      if (data.success) {
        setSelectedThread(data.thread);
      }
    } catch (error) {
      console.error('Failed to load thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
    }
  };

  const sendReply = async () => {
    if (!selectedThread || !replyContent.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/contractor/messages/${selectedThread.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });

      const data = await res.json();

      if (data.success) {
        setReplyContent('');
        await loadThread(selectedThread.id);
        toast({
          title: 'Success',
          description: 'Message sent',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const archiveThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/contractor/messages/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Thread archived' });
        setSelectedThread(null);
        loadThreads();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to archive', variant: 'destructive' });
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/contractor/messages/${threadId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Thread deleted' });
        setSelectedThread(null);
        loadThreads();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const folders = [
    { key: 'inbox' as const, label: 'Inbox', count: folder === 'inbox' ? threads.length : 0 },
    { key: 'sent' as const, label: 'Sent', count: folder === 'sent' ? threads.length : 0 },
    { key: 'archived' as const, label: 'Archived', count: folder === 'archived' ? threads.length : 0 },
    { key: 'trash' as const, label: 'Trash', count: folder === 'trash' ? threads.length : 0 },
  ];

  const showMainOnMobile = !!selectedThread;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden" style={{ minHeight: 'calc(100vh - 220px)' }}>
      <div className="flex flex-col md:flex-row h-full" style={{ minHeight: 'calc(100vh - 220px)' }}>
        
        {/* Sidebar - Folders */}
        <div className={`${showMainOnMobile ? 'hidden md:flex' : 'flex'} md:w-48 md:flex-shrink-0 md:border-r border-slate-700 flex-col py-3 gap-0.5 px-2 bg-slate-800/50 border-b md:border-b-0`}>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1">Folders</p>
          
          {/* Desktop folder list */}
          <div className="hidden md:flex flex-col gap-0.5">
            {folders.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFolder(key)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  folder === key
                    ? 'bg-violet-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className="text-[10px] bg-slate-600 px-1.5 py-0.5 rounded-full font-semibold text-slate-200">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mobile folder pills */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-1 px-1">
            {folders.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFolder(key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                  folder === key
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-slate-700 border border-slate-600 text-slate-300'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    folder === key ? 'bg-white/25 text-white' : 'bg-slate-600 text-slate-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Thread List */}
        <div className={`${showMainOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-72 md:flex-shrink-0 md:border-r border-slate-700 flex-col overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <p className="text-xs font-bold text-white capitalize">{folder}</p>
            <span className="text-[10px] text-slate-400">{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-700/50">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <MessageCircle className="h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">No messages here</p>
              </div>
            ) : (
              threads.map((thread) => {
                const lastMessage = thread.messages[0];
                const sender = lastMessage?.senderName || lastMessage?.senderEmail || thread.fromEmail || 'Unknown';
                const preview = lastMessage?.content?.slice(0, 80) || '';
                const isSelected = thread.id === selectedThread?.id;

                return (
                  <button
                    key={thread.id}
                    onClick={() => loadThread(thread.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left ${
                      isSelected ? 'bg-slate-800 md:border-l-2 md:border-violet-500' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
                      {sender.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-white truncate">{sender}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTime(thread.updatedAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate font-medium">{thread.subject || sender}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{preview || 'No content'}</p>
                    </div>
                    {thread.unreadCount && thread.unreadCount > 0 && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-violet-400 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Panel - Thread View */}
        <div className={`${showMainOnMobile ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden min-w-0`}>
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700 gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedThread(null)}
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-700 text-slate-300 flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-white truncate">{selectedThread.subject || 'Conversation'}</h2>
                  <p className="text-[11px] text-slate-400">{selectedThread.messages.length} message{selectedThread.messages.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {selectedThread.status === 'open' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveThread(selectedThread.id)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteThread(selectedThread.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 bg-slate-900/50">
                {selectedThread.messages.map((msg) => {
                  const isMe = msg.senderEmail === userEmail || msg.role === 'admin';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%]`}>
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[11px] font-semibold text-slate-400 truncate">
                            {msg.senderName || msg.senderEmail || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">{formatTime(msg.createdAt)}</span>
                        </div>
                        <div className={`rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed break-words ${
                          isMe
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <div className="border-t border-slate-700 px-3 sm:px-6 py-3 sm:py-4 bg-slate-900">
                <div className="flex gap-2 sm:gap-3">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 min-h-[44px] max-h-[120px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={!replyContent.trim() || sending}
                    className="h-11 w-11 p-0 bg-violet-600 hover:bg-violet-700"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <MessageCircle className="h-16 w-16 text-slate-600 mb-4" />
              <p className="text-sm font-bold text-white mb-1">Select a conversation</p>
              <p className="text-xs text-slate-400 max-w-xs">Choose a thread from the list to view and reply to messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Made with Bob
