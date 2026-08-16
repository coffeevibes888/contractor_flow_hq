 'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Function to request live agent (calls API)
const requestLiveAgent = async (userMessage: string) => {
  try {
    await fetch('/api/support/live-agent-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'live-chat-widget',
        message: userMessage,
      }),
    });
  } catch (error) {
    console.error('Failed to send live agent request:', error);
  }
};

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check business hours
  useEffect(() => {
    const checkBusinessHours = () => {
      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();
      const isWeekday = day >= 1 && day <= 5;
      const isBusinessHours = hours >= 9 && hours < 18;
      setIsOnline(isWeekday && isBusinessHours);
    };
    checkBusinessHours();
    const interval = setInterval(checkBusinessHours, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load conversation from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('pfhq-chat') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        const restored = parsed.map((m: ChatMessage & { timestamp: string }) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        if (restored.length > 0) {
          setMessages(restored);
          return;
        }
      }
    } catch { /* ignore */ }

    setMessages([{
      id: 'welcome',
      text: "👋 Hi there! I'm your Property Flow HQ assistant. How can I help you today? Ask me about features, pricing, getting started, or any questions!",
      isUser: false,
      timestamp: new Date(),
    }]);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist to localStorage
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || messages.length === 0) return;
      const serializable = messages.map((m) => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      }));
      localStorage.setItem('pfhq-chat', JSON.stringify(serializable));
    } catch { /* ignore */ }
  }, [messages]);

  const getAIResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    // Pricing questions
    if (lower.includes('pricing') || lower.includes('cost') || lower.includes('price') || lower.includes('plan') || lower.includes('subscription')) {
      return "We offer simple, transparent pricing:\n\n• **Starter** ($39/mo) - Up to 24 units\n• **Pro** ($99/mo) - Up to 150 units\n• **Enterprise** ($199/mo) - Unlimited units\n\nEvery plan includes a **14-day free trial**. Card is collected at checkout but the first charge isn't until day 15. Cancel anytime during the trial — zero charge. Want to get started?";
    }

    // Tenant screening
    if (lower.includes('tenant') || lower.includes('screen') || lower.includes('background') || lower.includes('credit check')) {
      return "Our tenant screening includes:\n\n• Credit checks & background reports\n• Employment verification\n• Rental history verification\n• Income verification\n• Eviction history\n\nScreening is included in Growth plans and above. You can also purchase individual reports on the Free plan.";
    }

    // Rent collection
    if (lower.includes('rent') || lower.includes('payment') || lower.includes('collect') || lower.includes('pay')) {
      return "Property Flow HQ makes rent collection easy:\n\n• **ACH bank transfers** - Low fees, 2-3 day processing\n• **Credit/debit cards** - Instant processing\n• **Automatic reminders** - 7, 3, and 1 day before due\n• **Late fee automation** - Set it and forget it\n\nFunds are held in your account and you can cash out to your bank anytime!";
    }

    // Maintenance
    if (lower.includes('maintenance') || lower.includes('repair') || lower.includes('work order') || lower.includes('contractor')) {
      return "Our maintenance system helps you stay on top of repairs:\n\n• Tenants submit requests with photos\n• Assign to contractors or your team\n• Track progress and costs\n• Automatic tenant updates\n• Full history for each unit\n\nYou can also manage your own contractor network and get competitive bids!";
    }

    // Lease management
    if (lower.includes('lease') || lower.includes('contract') || lower.includes('sign') || lower.includes('document')) {
      return "Digital lease management features:\n\n• **E-signatures** - DocuSign integration\n• **Custom templates** - Create your own or use ours\n• **Auto-renewals** - Set renewal reminders\n• **Document storage** - All leases in one place\n\nTenants can sign from any device, anywhere!";
    }

    // Getting started
    if (lower.includes('start') || lower.includes('sign up') || lower.includes('trial') || lower.includes('begin') || lower.includes('how do i')) {
      return "Getting started is easy! 🚀\n\n1. **Sign up** - Create your free account\n2. **Add properties** - Import or add manually\n3. **Invite tenants** - They'll get a portal login\n4. **Start collecting** - Set up rent payments\n\n Click 'Sign Up' in the top right to get started!";
    }

    // Features
    if (lower.includes('feature') || lower.includes('what can') || lower.includes('do you')) {
      return "Property Flow HQ includes:\n\n✅ Online rent collection\n✅ Tenant screening\n✅ Maintenance tracking\n✅ Digital lease signing\n✅ Tenant portal\n✅ Financial reporting\n✅ Contractor management\n✅ Team collaboration\n✅ Automated reminders\n\nWhat feature would you like to know more about?";
    }

    // Support/help
    if (lower.includes('help') || lower.includes('support') || lower.includes('contact') || lower.includes('talk to') || lower.includes('human') || lower.includes('agent') || lower.includes('person') || lower.includes('real person')) {
      // Trigger live agent request notification
      requestLiveAgent(userMessage);
      
      return isOnline 
        ? "I've notified our team that you'd like to speak with someone! 🔔\n\nA team member will join this chat shortly. In the meantime, feel free to share more details about what you need help with.\n\nYou can also:\n• Email us at support@propertyflowhq.com\n• Check our Help Center for guides"
        : "Our team is currently offline (Mon-Fri, 9am-6pm), but I've sent them a notification! 📬\n\nThey'll reach out as soon as they're back online. You can also:\n\n• Email support@propertyflowhq.com\n• Leave your contact info here\n\nWhat would you like help with?";
    }

    // Demo
    if (lower.includes('demo') || lower.includes('show me') || lower.includes('see it')) {
      return "We'd love to show you around! 🎯\n\nYou can:\n• **Sign up now** - Get full access immediately\n• **Schedule a demo** - Get a personalized walkthrough\n• **Watch videos** - See features in action\n\nWould you like me to help you schedule a demo call?";
    }

    // Default response
    return "Thanks for your message! I can help you with:\n\n• **Pricing & plans** - Find the right fit\n• **Features** - Rent collection, maintenance, screening\n• **Getting started** - Set up your account\n• **Support** - Troubleshoot issues\n\nWhat would you like to know more about?";
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsSending(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getAIResponse(userMessage.text);
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsSending(false);
    }, 800);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='fixed bottom-6 right-6 z-50 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110'
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X className='h-6 w-6' />
        ) : (
          <>
            <MessageCircle className='h-6 w-6' />
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className='fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300 flex flex-col max-h-[500px]'>
          {/* Header */}
          <div className='bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 shrink-0'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
                <MessageCircle className='h-5 w-5 text-white' />
              </div>
              <div>
                <h3 className='font-semibold text-white'>Property Flow HQ</h3>
                <p className='text-xs text-violet-100'>
                  {isOnline ? '🟢 Online - We reply in minutes' : '⚫ Offline - Leave a message'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className='flex-1 overflow-y-auto p-4 space-y-3 min-h-0'>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.isUser
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <p className='whitespace-pre-wrap'>{msg.text}</p>
                  <span className='text-[10px] opacity-60 block mt-1'>
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isSending && (
              <div className='flex justify-start'>
                <div className='bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2'>
                  <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className='border-t border-white/10 p-3 shrink-0'>
            <div className='flex gap-2'>
              <input
                type='text'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder='Ask about features, pricing...'
                disabled={isSending}
                className='flex-1 bg-slate-800 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50'
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                className='rounded-full bg-violet-600 p-2 text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Send className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
