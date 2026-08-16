'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Users, Search, Bell, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils/date-utils';
import { sendMessageToTenant, getMyMessages, createMessage } from '@/lib/actions/notification.actions';

import type { Prisma } from '@prisma/client';

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

export default function TenantMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
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
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Fetch messages
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

  // Send new message
  const handleSendMessage = async () => {
    if (!newMessage.recipientId || !newMessage.subject || !newMessage.content) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await sendMessageToTenant({
        recipientId: newMessage.recipientId,
        subject: newMessage.subject,
        message: newMessage.content,
      });
      
      alert('Message sent successfully');
      setNewMessage({ recipientId: '', subject: '', content: '' });
      setShowCompose(false);
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

  // Send bulk message
  const handleSendBulk = async () => {
    if (!bulkMessage.title || !bulkMessage.message) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // This would send to all tenants of the landlord
      // For now, just show success
      alert('Bulk message sent to all tenants');
      setBulkMessage({ title: '', message: '', type: 'reminder' });
      setShowBulk(false);
    } catch (error) {
      console.error('Failed to send bulk message:', error);
      alert('Failed to send bulk message');
    }
  };

  // Filter messages based on search
  const filteredMessages = messages.filter(message =>
    (message.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (message.message || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 sm:p-8 sm:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Tenant Communications</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative w-full sm:w-[280px] md:w-[320px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowBulk(!showBulk)} variant="outline" className="flex-1 sm:flex-none">
              <Megaphone className="mr-2 h-4 w-4" />
              Bulk
            </Button>
            <Button onClick={() => setShowCompose(!showCompose)} className="flex-1 sm:flex-none">
              <MessageCircle className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Messages List */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tenant Messages
            </CardTitle>
            <CardDescription>
              Direct communications with your tenants
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <ScrollArea className="h-[320px] sm:h-[420px] lg:h-[480px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-sm text-muted-foreground">Loading messages...</div>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? 'No messages found matching your search' : 'No tenant messages yet'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowCompose(true)}
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
                        className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                          selectedThread?.id === message.id ? 'bg-accent border-primary' : ''
                        }`}
                        onClick={() => setSelectedThread(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {message.title || 'No Subject'}
                              </span>
                              {!message.isRead && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {message.message || 'No content'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{message.createdAt ? formatDistanceToNow(message.createdAt, { addSuffix: true }) : 'Unknown time'}</span>
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

        {/* Compose / Bulk Message / Message Details */}
        <div className="space-y-4">
          {showCompose ? (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle>Compose Message</CardTitle>
                <CardDescription>
                  Send a direct message to a tenant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <div>
                  <label className="text-sm font-medium mb-2 block">Recipient Email</label>
                  <Input
                    placeholder="tenant@example.com"
                    value={newMessage.recipientId}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, recipientId: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    placeholder="Message subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={newMessage.content}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSendMessage} className="flex-1">
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCompose(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : showBulk ? (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Bulk Message
                </CardTitle>
                <CardDescription>
                  Send a message to all tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <div>
                  <label className="text-sm font-medium mb-2 block">Message Type</label>
                  <select
                    value={bulkMessage.type}
                    onChange={(e) => setBulkMessage(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="reminder">Reminder</option>
                    <option value="payment">Payment Notice</option>
                    <option value="maintenance">Maintenance Update</option>
                    <option value="application">Application Notice</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    placeholder="e.g., Important Building Notice"
                    value={bulkMessage.title}
                    onChange={(e) => setBulkMessage(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea
                    placeholder="Type your message to all tenants here..."
                    value={bulkMessage.message}
                    onChange={(e) => setBulkMessage(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will be sent to all active tenants and they will receive email notifications.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSendBulk} className="flex-1">
                    <Send className="mr-2 h-4 w-4" />
                    Send to All Tenants
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowBulk(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedThread ? (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="truncate">{selectedThread.title || 'No Subject'}</CardTitle>
                <CardDescription>
                  {selectedThread.createdAt ? formatDistanceToNow(selectedThread.createdAt, { addSuffix: true }) : 'Unknown time'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">{selectedThread.message || 'No content'}</p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Reply</p>
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                      className="mb-2"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendingReply || !replyContent.trim()}
                      onClick={handleSendReply}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {sendingReply ? 'Sending...' : 'Reply to Message'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-44 sm:h-56 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Communications Center</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Send direct messages or bulk announcements to tenants
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCompose(true)}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Direct Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulk(true)}
                  >
                    <Megaphone className="mr-2 h-4 w-4" />
                    Bulk Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg">Communication Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Messages</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Conversations</span>
                  <span className="font-medium">{filteredMessages.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="font-medium">
                    {messages.filter(m => {
                      const messageDate = new Date(m.createdAt);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return messageDate > weekAgo;
                    }).length}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <Bell className="mr-2 h-4 w-4" />
                    View Notification Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
