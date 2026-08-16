'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Users, X, Minimize2 } from 'lucide-react';
import { TeamChat } from './team-chat';
import { useSession } from 'next-auth/react';

interface TeamChatWidgetProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role?: string;
  };
  landlordId: string;
  isTeamMember: boolean;
  isTenant: boolean;
  subscriptionTier?: string;
}

export function TeamChatWidget({ 
  currentUser, 
  landlordId, 
  isTeamMember, 
  isTenant,
  subscriptionTier = 'starter',
}: TeamChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: session } = useSession();

  // Check if chat should be available
  const hasChatAccess = isTeamMember || (isTenant && (subscriptionTier === 'pro' || subscriptionTier === 'enterprise'));

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

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const res = await fetch('/api/landlord/team/members');
        const data = await res.json();
        if (data.success && data.members) {
          setTeamMembers(data.members);
        }
      } catch {
        // Ignore errors
      }
    };
    
    if (hasChatAccess) {
      loadTeamMembers();
    }
  }, [hasChatAccess]);

  // Poll for unread messages - replaced with WebSocket
  // This can be removed or simplified since WebSocket will handle real-time updates
  useEffect(() => {
    if (!hasChatAccess || isOpen) return;

    const checkUnread = async () => {
      try {
        const res = await fetch('/api/landlord/team/messages/unread');
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Ignore errors
      }
    };

    // Check once on mount, then rely on WebSocket for updates
    checkUnread();
    
    // Reduced polling frequency as backup (every 5 minutes instead of 30 seconds)
    const interval = setInterval(checkUnread, 300000);

    return () => clearInterval(interval);
  }, [hasChatAccess, isOpen]);

  // Reset unread count when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Don't show if no access
  if (!hasChatAccess || !session?.user) {
    return null;
  }

  const widgetLabel = isTeamMember ? 'Team Chat' : 'Contact Support';
  const widgetDescription = isTeamMember 
    ? (isOnline ? '🟢 Team Online' : '⚫ Team Offline')
    : (isOnline ? '🟢 Support Available' : '⚫ Outside Business Hours');

  return (
    <>
      {isOpen && !isMinimized && (
        <div className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent" onClick={() => setIsOpen(false)} />
      )}

      <div className={`fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end justify-end`}>
        {/* Floating Button */}
        {(!isOpen || isMinimized) && (
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110 order-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white"
          >
            <div className="relative">
              {isTeamMember ? (
                <Users className="w-6 h-6" />
              ) : (
                <MessageCircle className="w-6 h-6" />
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-green-500' : 'bg-slate-400'
                }`}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </button>
        )}

        {/* Status Label */}
        {(!isOpen || isMinimized) && (
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-md order-2 border border-slate-200 dark:border-slate-700">
            <div className="font-medium">{widgetLabel}</div>
            <div className="text-[10px]">{widgetDescription}</div>
          </div>
        )}

        {/* Chat Window */}
        {isOpen && !isMinimized && (
          <div className="fixed top-[env(safe-area-inset-top,16px)] left-4 right-4 bottom-4 sm:inset-auto sm:relative sm:w-[380px] md:w-[600px] lg:w-[800px] h-[calc(100vh-env(safe-area-inset-top,16px)-16px)] sm:h-[500px] md:h-[600px] lg:h-[700px] sm:max-h-[calc(100vh-100px)] rounded-lg shadow-2xl overflow-hidden order-3 mb-2 z-50 bg-slate-950 border border-white/10">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 border-b border-white/10">
              <div className="flex items-center gap-3">
                {isTeamMember ? (
                  <Users className="w-5 h-5 text-white" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-white" />
                )}
                <div>
                  <h3 className="text-white font-semibold text-sm">{widgetLabel}</h3>
                  <p className="text-white/80 text-xs">{widgetDescription}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/admin/messages"
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white text-xs font-medium px-3"
                  title="Open in Messages"
                >
                  Open Full View
                </a>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="h-[calc(100%-60px)]">
              <TeamChat
                currentUser={currentUser}
                landlordId={landlordId}
                onClose={() => setIsOpen(false)}
                isFullPage={false}
                teamMembers={teamMembers}
                canManageTeam={isTeamMember}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}