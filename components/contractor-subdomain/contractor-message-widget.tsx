'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Paperclip, 
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  User,
  Loader2,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  createdAt: Date;
  isContractor: boolean;
}

interface ContractorMessageWidgetProps {
  contractorId: string;
  contractorName: string;
  contractorImage?: string | null;
  contractorEmail?: string | null;
  contractorPhone?: string | null;
  subdomain: string;
  isAvailable?: boolean;
  responseTime?: string;
}

export function ContractorMessageWidget({
  contractorId,
  contractorName,
  contractorImage,
  contractorEmail,
  contractorPhone,
  subdomain,
  isAvailable = true,
  responseTime = 'Usually responds within 2 hours',
}: ContractorMessageWidgetProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing conversation if user is logged in
  useEffect(() => {
    if (session?.user?.id && isOpen) {
      loadMessages();
    }
  }, [session?.user?.id, isOpen]);

  const loadMessages = async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contractor/${contractorId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          setHasStartedChat(data.messages.length > 0);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      const payload = session?.user?.id 
        ? { content: newMessage, contractorId }
        : { content: newMessage, contractorId, guestInfo };

      const res = await fetch(`/api/contractor/${contractorId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        setHasStartedChat(true);
        
        // Add auto-reply for guests
        if (!session?.user?.id) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: `auto-${Date.now()}`,
              content: `Thanks for reaching out! ${contractorName} has received your message and will respond soon. You'll receive a notification at ${guestInfo.email} when they reply.`,
              senderId: contractorId,
              senderName: contractorName,
              senderImage: contractorImage || undefined,
              createdAt: new Date(),
              isContractor: true,
            }]);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Guest contact form before starting chat
  const GuestContactForm = () => (
    <div className="p-4 space-y-4">
      <div className="text-center mb-4">
        <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          {contractorImage ? (
            <Image src={contractorImage} alt={contractorName} width={64} height={64} className="rounded-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-white" />
          )}
        </div>
        <h3 className="font-semibold text-white">{contractorName}</h3>
        <p className="text-sm text-slate-400">{responseTime}</p>
      </div>
      
      <div className="space-y-3">
        <Input
          placeholder="Your name"
          value={guestInfo.name}
          onChange={(e) => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
        <Input
          type="email"
          placeholder="Your email"
          value={guestInfo.email}
          onChange={(e) => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
        <Input
          type="tel"
          placeholder="Phone (optional)"
          value={guestInfo.phone}
          onChange={(e) => setGuestInfo(prev => ({ ...prev, phone: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      <Button
        onClick={() => setHasStartedChat(true)}
        disabled={!guestInfo.name || !guestInfo.email}
        className="w-full bg-violet-600 hover:bg-violet-700"
      >
        Start Conversation
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-900 px-2 text-slate-500">or contact directly</span>
        </div>
      </div>

      <div className="flex gap-2">
        {contractorPhone && (
          <a
            href={`tel:${contractorPhone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        )}
        {contractorEmail && (
          <a
            href={`mailto:${contractorEmail}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        )}
      </div>

      <p className="text-xs text-center text-slate-500">
        Already have an account?{' '}
        <Link href={`/${subdomain}/sign-in`} className="text-violet-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );

  return (
    <>
      {/* Floating Message Button - Bottom Right */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 shadow-2xl shadow-violet-500/50 flex items-center justify-center text-white hover:shadow-violet-500/70 transition-shadow"
          >
            <MessageCircle className="h-7 w-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[400px] h-[600px] max-h-[calc(100vh-32px)] bg-slate-900 rounded-2xl border border-white/10 shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                      {contractorImage ? (
                        <Image src={contractorImage} alt={contractorName} width={40} height={40} className="rounded-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-violet-600 ${isAvailable ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{contractorName}</h3>
                    <p className="text-white/70 text-xs">{isAvailable ? 'Online' : 'Away'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session?.user?.id && (
                    <a
                      href="/user/profile/inbox"
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white text-xs font-medium px-3"
                      title="Open in Messages"
                    >
                      View All
                    </a>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              {!session?.user?.id && !hasStartedChat ? (
                <GuestContactForm />
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-violet-500/20 flex items-center justify-center">
                          <MessageCircle className="h-6 w-6 text-violet-400" />
                        </div>
                        <p className="text-slate-400 text-sm">Start a conversation with {contractorName}</p>
                        <p className="text-slate-500 text-xs mt-1">Ask about services, availability, or request a quote</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isContractor ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[80%] ${msg.isContractor ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                msg.isContractor
                                  ? 'bg-slate-800 text-white rounded-bl-md'
                                  : 'bg-violet-600 text-white rounded-br-md'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-white/10">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 min-h-[44px] max-h-[120px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                        rows={1}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className="h-11 w-11 p-0 bg-violet-600 hover:bg-violet-700"
                      >
                        {isSending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
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
