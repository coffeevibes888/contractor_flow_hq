'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, Check, CheckCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from '@/lib/utils/date-utils';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  type: 'application' | 'message' | 'maintenance' | 'payment' | 'reminder';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export default function NotificationBell({ isAdmin }: { isAdmin: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!session?.user?.id || status !== 'authenticated') {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/notifications?userId=${session.user.id}&limit=10&includeRead=true`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        // Only log error if user is authenticated (not a 401)
        if (response.status !== 401) {
          console.error('Failed to fetch notifications:', response.status, await response.text());
        }
      }
    } catch {
      // Silently ignore — TypeError: Failed to fetch is expected during hot-reload
      // or when the server is briefly unavailable. The 30s poll will retry automatically.
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        // Update local state immediately
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        // Recalculate unread count from updated notifications
        setUnreadCount(prev => {
          const notification = notifications.find(n => n.id === notificationId);
          return notification && !notification.isRead ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch {
      // Silently ignore transient network errors
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // Silently ignore transient network errors
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string, isRead: boolean) => {
    const iconColor = isRead ? '#94a3b8' : '#2563eb';
    
    switch (type) {
      case 'application':
        return <span style={{ color: iconColor }}>📋</span>;
      case 'message':
        return <span style={{ color: iconColor }}>💬</span>;
      case 'maintenance':
        return <span style={{ color: iconColor }}>🔧</span>;
      case 'payment':
        return <span style={{ color: iconColor }}>💳</span>;
      case 'reminder':
        return <span style={{ color: iconColor }}>🔔</span>;
      default:
        return <span style={{ color: iconColor }}>📬</span>;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first, then navigate
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    setIsOpen(false);
    
    if (notification.actionUrl) {
      // Small delay to allow state update before navigation
      setTimeout(() => {
        window.location.href = notification.actionUrl!;
      }, 100);
    }
  };

  useEffect(() => {
    if (status === 'loading') {
      return; // Wait for session to load
    }
    
    if (session?.user?.id) {
      fetchNotifications();
      
      // Set up polling for new notifications
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [session?.user?.id, status]);

  if (status === 'loading' || !session?.user?.id) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-black hover:text-black hover:bg-gray-100">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between p-4">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-auto p-1"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-xs h-auto p-1">
                <Settings className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-4 cursor-pointer focus:bg-accent"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.isRead)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {notification.title}
                        </p>
                        <p className={`text-sm mt-1 line-clamp-2 ${
                          notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {!notification.isRead && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <DropdownMenuItem asChild>
                <Link href={isAdmin ? "/admin/messages" : "/user/notifications"} className="w-full justify-center cursor-pointer">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
