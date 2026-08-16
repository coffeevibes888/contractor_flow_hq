'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationBadge } from './NotificationBadge';
import {
  Bell,
  AlertTriangle,
  Ban,
  Lock,
  TrendingUp,
  Check,
  X,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'limit_warning' | 'limit_reached' | 'upgrade_prompt' | 'feature_locked';
  feature: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationDropdownProps {
  contractorId: string;
  className?: string;
}

export function NotificationDropdown({
  contractorId,
  className = '',
}: NotificationDropdownProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contractor/subscription/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/contractor/subscription/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/contractor/subscription/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        toast({
          title: 'Notification dismissed',
          description: 'The notification has been removed.',
        });
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss notification.',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'limit_warning':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'limit_reached':
        return <Ban className="h-4 w-4 text-red-400" />;
      case 'feature_locked':
        return <Lock className="h-4 w-4 text-violet-400" />;
      case 'upgrade_prompt':
        return <TrendingUp className="h-4 w-4 text-blue-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const getNotificationVariant = (type: string): 'default' | 'warning' | 'critical' => {
    switch (type) {
      case 'limit_warning':
        return 'warning';
      case 'limit_reached':
        return 'critical';
      default:
        return 'default';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative hover:bg-white/5 ${className}`}
        >
          <Bell className="h-5 w-5 text-slate-400" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1">
              <NotificationBadge
                count={unreadCount}
                variant={
                  notifications.some((n) => !n.read && n.type === 'limit_reached')
                    ? 'critical'
                    : notifications.some((n) => !n.read && n.type === 'limit_warning')
                    ? 'warning'
                    : 'default'
                }
                size="sm"
              />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] bg-slate-900 border-white/10"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-white font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs text-slate-400">
              {unreadCount} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-slate-400 text-sm mt-2">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No notifications</p>
            <p className="text-slate-500 text-xs mt-1">
              You're all caught up!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    relative group rounded-lg p-3 cursor-pointer
                    transition-colors
                    ${
                      notification.read
                        ? 'bg-slate-800/30 hover:bg-slate-800/50'
                        : 'bg-slate-800/60 hover:bg-slate-800/80'
                    }
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm ${
                            notification.read ? 'text-slate-400' : 'text-white font-medium'
                          }`}
                        >
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>

                        {notification.actionUrl && (
                          <ExternalLink className="h-3 w-3 text-slate-500" />
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-slate-400 hover:text-white hover:bg-white/5"
                onClick={() => {
                  router.push('/contractor-dashboard/settings/subscription');
                  setOpen(false);
                }}
              >
                View Subscription Settings
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
