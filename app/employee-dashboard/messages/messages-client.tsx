'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Hash, Users, Megaphone, Send,
  Loader2, User, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

interface Message {
  id: string;
  channelId: string;
  content: string;
  senderName: string;
  senderId: string;
  createdAt: string;
  isAnnouncement: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface Props {
  employeeId: string;
  employeeName: string;
  contractorId: string;
  channels: Channel[];
  recentMessages: Message[];
  teamMembers: TeamMember[];
}

export default function MessagesClient({ employeeId, employeeName, contractorId, channels, recentMessages, teamMembers }: Props) {
  const [activeChannel, setActiveChannel] = useState<string | null>(channels[0]?.id || null);
  const [messages, setMessages] = useState(recentMessages);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'channels' | 'team'>('channels');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages
    .filter(m => m.channelId === activeChannel)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const announcements = messages.filter(m => m.isAnnouncement);
  const activeChannelData = channels.find(c => c.id === activeChannel);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChannel) return;
    setSending(true);
    try {
      const res = await fetch('/api/employee/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          contractorId,
          channelId: activeChannel,
          content: newMessage.trim(),
          senderName: employeeName,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, {
          id: json.id || Date.now().toString(),
          channelId: activeChannel,
          content: newMessage.trim(),
          senderName: employeeName,
          senderId: employeeId,
          createdAt: new Date().toISOString(),
          isAnnouncement: false,
        }]);
        setNewMessage('');
      }
    } catch {} finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Messages</h1>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* Sidebar — Channels & Team */}
        <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50 hidden md:flex">
          {/* View toggle */}
          <div className="p-3 border-b border-slate-200 flex gap-1">
            <button onClick={() => setView('channels')} className={cn('flex-1 px-3 py-1.5 rounded-lg text-xs font-medium', view === 'channels' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              <Hash className="h-3 w-3 inline mr-1" /> Channels
            </button>
            <button onClick={() => setView('team')} className={cn('flex-1 px-3 py-1.5 rounded-lg text-xs font-medium', view === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              <Users className="h-3 w-3 inline mr-1" /> Team
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {view === 'channels' ? (
              <>
                {channels.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 text-center">No channels yet</p>
                ) : (
                  channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                        activeChannel === ch.id ? 'bg-orange-100 text-orange-800 font-medium' : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <Hash className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{ch.name}</span>
                    </button>
                  ))
                )}
                {/* Announcements */}
                {announcements.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Announcements</p>
                    <div className="px-3 space-y-2">
                      {announcements.slice(0, 3).map(a => (
                        <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
                          <Megaphone className="h-3 w-3 inline mr-1" />
                          {a.content.length > 60 ? a.content.substring(0, 60) + '…' : a.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.name}</p>
                    <p className="text-[10px] text-slate-400">{member.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {/* Channel header */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <Hash className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-900 text-sm">{activeChannelData?.name || 'Select a channel'}</span>
            {activeChannelData?.description && (
              <span className="text-xs text-slate-400 ml-2 hidden sm:inline">— {activeChannelData.description}</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {!activeChannel ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                <MessageSquare className="h-8 w-8 mr-2 opacity-50" /> Select a channel to start chatting
              </div>
            ) : channelMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No messages yet. Be the first to say something!
              </div>
            ) : (
              channelMessages.map((msg) => {
                const isMe = msg.senderId === employeeId;
                return (
                  <div key={msg.id} className={cn('flex gap-3', isMe && 'flex-row-reverse')}>
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                      isMe ? 'bg-gradient-to-br from-orange-400 to-rose-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    )}>
                      {msg.senderName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className={cn('max-w-[70%]', isMe && 'text-right')}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-700">{isMe ? 'You' : msg.senderName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={cn(
                        'inline-block px-3.5 py-2 rounded-xl text-sm',
                        isMe ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          {activeChannel && (
            <div className="px-5 py-3 border-t border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={`Message #${activeChannelData?.name || 'channel'}...`}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="h-10 w-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
