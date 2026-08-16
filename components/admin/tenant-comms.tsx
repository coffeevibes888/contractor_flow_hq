'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Megaphone,
  MessageCircle,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils/date-utils';
import { createMessage, getMyMessages } from '@/lib/actions/notification.actions';
import type { Prisma } from '@prisma/client';

type TenantOption = {
  id: string;
  name: string;
  email: string;
  unitName?: string;
  propertyName?: string;
};

interface TenantCommsProps {
  tenants?: TenantOption[];
  landlordId?: string;
  hideHeader?: boolean;
}

interface Message {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Prisma.JsonValue;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: Date;
}

export default function TenantComms({
  tenants = [],
  landlordId,
  hideHeader = false,
}: TenantCommsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    subject: '',
    content: '',
  });
  const [showCompose, setShowCompose] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkMessage, setBulkMessage] = useState({
    title: '',
    message: '',
    type: 'reminder' as const,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileTab, setMobileTab] = useState<'inbox' | 'panel'>('inbox');
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchMessages = async () => {
    try {
      const result = await getMyMessages();
      setMessages(result || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      alert('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.recipientId || !newMessage.subject || !newMessage.content) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await createMessage({
        recipientId: newMessage.recipientId,
        title: newMessage.subject,
        message: newMessage.content,
      });

      alert('Message sent successfully');
      setNewMessage({ recipientId: '', subject: '', content: '' });
      setShowCompose(false);
      setMobileTab('inbox');
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyContent.trim()) {
      return;
    }

    // The original sender id is stored on the notification metadata. If we
    // can't resolve a recipient (e.g. a system-generated message) there's
    // nobody to reply to.
    const meta = (selectedThread.metadata ?? {}) as Record<string, unknown>;
    const recipientId =
      typeof meta.senderId === 'string' ? meta.senderId : selectedThread.userId;

    if (!recipientId) {
      alert('This message has no sender to reply to.');
      return;
    }

    setSendingReply(true);
    try {
      const subject = selectedThread.title?.startsWith('Re:')
        ? selectedThread.title
        : `Re: ${selectedThread.title || 'No Subject'}`;

      await createMessage({
        recipientId,
        title: subject,
        message: replyContent.trim(),
      });

      setReplyContent('');
      fetchMessages();
      alert('Reply sent');
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendBulk = async () => {
    if (!bulkMessage.title || !bulkMessage.message) {
      alert('Please fill in all fields');
      return;
    }

    try {
      alert('Bulk message sent to all tenants');
      setBulkMessage({ title: '', message: '', type: 'reminder' });
      setShowBulk(false);
      setMobileTab('inbox');
    } catch (error) {
      console.error('Failed to send bulk message:', error);
      alert('Failed to send bulk message');
    }
  };

  const filteredMessages = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return messages.filter((message) =>
      (message.title || '').toLowerCase().includes(q) ||
      (message.message || '').toLowerCase().includes(q)
    );
  }, [messages, searchTerm]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const messagesList = () => (
    <Card className="!border-white/10 !bg-slate-900/40 text-slate-50 lg:col-span-2">
      <CardHeader className="border-b border-white/10 p-3 sm:p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-slate-50 text-base sm:text-lg">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          Tenant Messages
        </CardTitle>
        <CardDescription className="text-slate-300/80 text-xs sm:text-sm">
          Direct communications with your tenants
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-3 sm:p-4 sm:pt-4 md:p-6 md:pt-4">
        <ScrollArea className="h-[280px] sm:h-[320px] md:h-[420px] lg:h-[480px] pr-2 sm:pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-slate-300/80">Loading messages...</div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400/80 mb-3 sm:mb-4" />
              <div className="text-xs sm:text-sm text-slate-300/80">
                {searchTerm ? 'No messages found matching your search' : 'No tenant messages yet'}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 !border-white/10 !bg-slate-900/40 text-slate-100 hover:!bg-slate-900/70 text-xs"
                onClick={() => {
                  setShowCompose(true);
                  setMobileTab('panel');
                }}
              >
                Send your first message
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => {
                return (
                  <div
                    key={message.id}
                    className={`p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/60 cursor-pointer transition-colors hover:border-violet-400/60 hover:bg-slate-900/90 ${
                      selectedThread?.id === message.id
                        ? 'border-violet-400/60 bg-slate-900/90'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedThread(message);
                      setShowCompose(false);
                      setShowBulk(false);
                      setMobileTab('panel');
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs sm:text-sm truncate text-slate-100/90">
                            {message.title || 'No Subject'}
                          </span>
                          {!message.isRead && (
                            <Badge className="text-[10px] sm:text-xs bg-white/5 text-slate-200 border border-white/10">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300/80 truncate mb-1.5 sm:mb-2">
                          {message.message || 'No content'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400/90">
                          <span>
                            {message.createdAt
                              ? formatDistanceToNow(message.createdAt, { addSuffix: true })
                              : 'Unknown time'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const panel = () => (
    <div className="space-y-3 sm:space-y-4">
      {showCompose ? (
        <Card className="!border-white/10 !bg-slate-900/40 text-slate-50">
          <CardHeader className="border-b border-white/10 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-slate-50 text-base sm:text-lg">Compose Message</CardTitle>
            <CardDescription className="text-slate-300/80 text-xs sm:text-sm">
              Send a direct message to a tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 pt-3 sm:p-4 sm:pt-4 md:p-6 md:pt-4">
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block text-slate-200">Recipient</label>
              {tenants.length > 0 ? (
                <select
                  value={newMessage.recipientId}
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value);
                    setNewMessage((prev) => ({
                      ...prev,
                      recipientId: e.target.value,
                    }));
                  }}
                  className="w-full rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/60 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/70"
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} • {t.email}
                      {t.propertyName ? ` • ${t.propertyName}` : ''}
                      {t.unitName ? ` / ${t.unitName}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="Tenant user id"
                  value={newMessage.recipientId}
                  onChange={(e) =>
                    setNewMessage((prev) => ({
                      ...prev,
                      recipientId: e.target.value,
                    }))
                  }
                  className="!border-white/10 !bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-violet-500/70 text-xs sm:text-sm"
                />
              )}
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block text-slate-200">Subject</label>
              <Input
                placeholder="Message subject"
                value={newMessage.subject}
                onChange={(e) =>
                  setNewMessage((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                className="!border-white/10 !bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-violet-500/70 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block text-slate-200">Message</label>
              <Textarea
                placeholder="Type your message here..."
                value={newMessage.content}
                onChange={(e) =>
                  setNewMessage((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                rows={3}
                className="!border-white/10 !bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-violet-500/70 text-xs sm:text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendMessage}
                className="flex-1 bg-violet-500 hover:bg-violet-400 text-white text-xs sm:text-sm"
              >
                <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Send
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompose(false);
                  setMobileTab('inbox');
                }}
                className="!border-white/10 !bg-slate-900/40 text-slate-100 hover:!bg-slate-900/70 text-xs sm:text-sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : showBulk ? (
        <Card className="!border-white/10 !bg-slate-900/40 text-slate-50">
          <CardHeader className="border-b border-white/10 p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-slate-50 text-base sm:text-lg">
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
              Bulk Message
            </CardTitle>
            <CardDescription className="text-slate-300/80 text-xs sm:text-sm">
              Send a message to all tenants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 pt-3 sm:p-4 sm:pt-4 md:p-6 md:pt-4">
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block text-slate-200">Message Type</label>
              <select
                value={bulkMessage.type}
                onChange={(e) =>
                  setBulkMessage((prev) => ({
                    ...prev,
                    type: e.target.value as any,
                  }))
                }
                className="w-full rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/60 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/70"
              >
                <option value="reminder">Reminder</option>
                <option value="payment">Payment Notice</option>
                <option value="maintenance">Maintenance Update</option>
                <option value="application">Application Notice</option>
              </select>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block text-slate-200">Subject</label>
              <Input
                placeholder="e.g., Important Building Notice"
                value={bulkMessage.title}
                onChange={(e) =>
                  setBulkMessage((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="!border-white/10 !bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-violet-500/70 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block text-slate-200">Message</label>
              <Textarea
                placeholder="Type your message to all tenants here..."
                value={bulkMessage.message}
                onChange={(e) =>
                  setBulkMessage((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                rows={3}
                className="!border-white/10 !bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-violet-500/70 text-xs sm:text-sm"
              />
            </div>
            <div className="bg-white/5 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-white/10">
              <p className="text-[10px] sm:text-sm text-slate-200/90">
                <strong>Note:</strong> This will be sent to all active tenants and they will receive email notifications.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendBulk}
                className="flex-1 bg-violet-500 hover:bg-violet-400 text-white text-xs sm:text-sm"
              >
                <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Send
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulk(false);
                  setMobileTab('inbox');
                }}
                className="!border-white/10 !bg-slate-900/40 text-slate-100 hover:!bg-slate-900/70 text-xs sm:text-sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : selectedThread ? (
        <Card className="!border-white/10 !bg-slate-900/40 text-slate-50">
          <CardHeader className="border-b border-white/10 p-3 sm:p-4 md:p-6">
            <CardTitle className="truncate text-slate-50 text-base sm:text-lg">
              {selectedThread.title || 'No Subject'}
            </CardTitle>
            <CardDescription className="text-slate-300/80 text-xs sm:text-sm">
              {selectedThread.createdAt
                ? formatDistanceToNow(selectedThread.createdAt, { addSuffix: true })
                : 'Unknown time'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-3 sm:p-4 sm:pt-4 md:p-6 md:pt-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs sm:text-sm text-slate-200/90">{selectedThread.message || 'No content'}</p>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-white/10">
                <p className="text-xs sm:text-sm text-slate-300/80 mb-2">Reply</p>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  className="mb-2 !border-white/10 !bg-slate-900/40 text-slate-100 text-xs sm:text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sendingReply || !replyContent.trim()}
                  onClick={handleSendReply}
                  className="!border-white/10 !bg-slate-900/40 text-slate-100 text-xs sm:text-sm"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {sendingReply ? 'Sending...' : 'Reply to Message'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="!border-white/10 !bg-slate-900/40 text-slate-50">
          <CardContent className="flex flex-col items-center justify-center h-36 sm:h-44 md:h-56 text-center pt-4 sm:pt-6">
            <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400/80 mb-3 sm:mb-4" />
            <h3 className="font-medium mb-1.5 sm:mb-2 text-sm sm:text-base">Communications Center</h3>
            <p className="text-xs sm:text-sm text-slate-300/80 mb-3 sm:mb-4">
              Send direct messages or bulk announcements to tenants
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCompose(true);
                  setMobileTab('panel');
                }}
                className="!border-white/10 !bg-slate-900/40 text-slate-100 hover:!bg-slate-900/70 text-xs sm:text-sm"
              >
                <MessageCircle className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Direct
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBulk(true);
                  setMobileTab('panel');
                }}
                className="!border-white/10 !bg-slate-900/40 text-slate-100 hover:!bg-slate-900/70 text-xs sm:text-sm"
              >
                <Megaphone className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Bulk
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="!border-white/10 !bg-slate-900/40 text-slate-50">
        <CardHeader className="border-b border-white/10 p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg text-slate-50">Communication Stats</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-3 sm:p-4 sm:pt-4 md:p-6 md:pt-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-slate-300/80">Total Messages</span>
              <span className="font-medium text-sm">{messages.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-slate-300/80">Active Conversations</span>
              <span className="font-medium text-sm">{filteredMessages.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-slate-300/80">This Week</span>
              <span className="font-medium text-sm">
                {
                  messages.filter((m) => {
                    const messageDate = new Date(m.createdAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return messageDate > weekAgo;
                  }).length
                }
              </span>
            </div>
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full !border-white/10 !bg-slate-900/40 text-slate-100 hover:!bg-slate-900/70 text-xs sm:text-sm"
              >
                <Bell className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                View Notification Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4 text-slate-50">
      {!hideHeader && (
        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
              Tenant Communications
            </h2>
            <p className="text-xs sm:text-sm text-slate-300/80">
              Direct messages and announcements to tenants.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full sm:max-w-md space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400/90" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-9 w-full !border-white/10 !bg-slate-900/60 text-slate-50 placeholder:text-slate-500 focus-visible:ring-violet-500/70 text-xs sm:text-sm h-9 sm:h-10"
            />
          </div>

          {tenants.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-300/80">
                Send to tenant
              </p>
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedTenantId(value);
                  if (value) {
                    setNewMessage((prev) => ({ ...prev, recipientId: value }));
                    setShowCompose(true);
                    setShowBulk(false);
                    setSelectedThread(null);
                    setMobileTab('panel');
                  }
                }}
                className="w-full rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/60 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/70"
              >
                <option value="">Select a tenant...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} • {t.email}
                    {t.propertyName ? ` • ${t.propertyName}` : ''}
                    {t.unitName ? ` / ${t.unitName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:flex-nowrap">
          <Button
            onClick={() => {
              setShowBulk((v) => !v);
              setShowCompose(false);
              setSelectedThread(null);
              setMobileTab('panel');
            }}
            variant="outline"
            className="flex-1 sm:flex-none !border-white/10 !bg-slate-900/40 text-slate-100 hover:!bg-slate-900/70 text-xs sm:text-sm h-9 sm:h-10"
          >
            <Megaphone className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Bulk
          </Button>
          <Button
            onClick={() => {
              setShowCompose((v) => !v);
              setShowBulk(false);
              setSelectedThread(null);
              setMobileTab('panel');
            }}
            className="flex-1 sm:flex-none bg-violet-500 hover:bg-violet-400 text-white text-xs sm:text-sm h-9 sm:h-10"
          >
            <MessageCircle className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Compose
          </Button>
        </div>
      </div>

      <div className="lg:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 !bg-slate-900/40 !text-slate-200 h-9 sm:h-10">
            <TabsTrigger value="inbox" className="!bg-transparent data-[state=active]:!bg-slate-900/80 data-[state=active]:!text-slate-50 text-xs sm:text-sm">
              Inbox
            </TabsTrigger>
            <TabsTrigger value="panel" className="!bg-transparent data-[state=active]:!bg-slate-900/80 data-[state=active]:!text-slate-50 text-xs sm:text-sm">
              Actions
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="mt-2 sm:mt-3">
            {messagesList()}
          </TabsContent>
          <TabsContent value="panel" className="mt-2 sm:mt-3">
            {panel()}
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden lg:grid gap-4 lg:grid-cols-3">
        {messagesList()}
        {panel()}
      </div>
    </div>
  );
}
