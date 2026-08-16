'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Paperclip,
  Phone,
  Mail,
  User,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Contractor = {
  id: string;
  businessName: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

type Message = {
  id: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: Date;
  contractorId: string;
  job: {
    id: string;
    title: string;
  } | null;
};

type MessageGroup = {
  contractor: Contractor;
  messages: Message[];
  unreadCount: number;
};

export function CustomerMessageCenter({
  messagesByContractor,
  userId,
}: {
  messagesByContractor: MessageGroup[];
  userId: string;
}) {
  const [selectedContractor, setSelectedContractor] = useState<string | null>(
    messagesByContractor[0]?.contractor.id || null
  );
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedGroup = messagesByContractor.find(
    (g) => g.contractor.id === selectedContractor
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedGroup?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContractor) return;

    setSending(true);
    try {
      const response = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractorUserId: selectedContractor,
          message: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Refresh messages
        window.location.reload();
      } else {
        const data = await response.json().catch(() => ({}));
        console.error('Failed to send message:', data.error || response.statusText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (messagesByContractor.length === 0) {
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-12">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Messages Yet
          </h3>
          <p className="text-gray-600">
            Start a project with a contractor to begin messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Contractors List */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Contractors</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {messagesByContractor.map((group) => (
              <button
                key={group.contractor.id}
                onClick={() => setSelectedContractor(group.contractor.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedContractor === group.contractor.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-2 rounded-full bg-blue-100">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {group.contractor.businessName || group.contractor.displayName}
                      </p>
                    </div>
                    {group.messages.length > 0 && (
                      <p className="text-xs text-gray-500 truncate ml-10">
                        {group.messages[0].message.substring(0, 40)}...
                      </p>
                    )}
                  </div>
                  {group.unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs">
                      {group.unreadCount}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message Thread */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm flex flex-col h-[600px]">
          {/* Header */}
          {selectedGroup && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedGroup.contractor.businessName ||
                      selectedGroup.contractor.displayName}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    {selectedGroup.contractor.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{selectedGroup.contractor.email}</span>
                      </div>
                    )}
                    {selectedGroup.contractor.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{selectedGroup.contractor.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedGroup?.messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No messages yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Start the conversation below
                </p>
              </div>
            ) : (
              selectedGroup?.messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  {message.subject && (
                    <div className="text-sm font-medium text-gray-900">
                      {message.subject}
                    </div>
                  )}
                  {message.job && (
                    <div className="text-xs text-blue-600 mb-1">
                      Re: {message.job.title}
                    </div>
                  )}
                  <div className="rounded-lg bg-gray-100 p-3">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {message.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-lg border-2 border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-gray-200"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
