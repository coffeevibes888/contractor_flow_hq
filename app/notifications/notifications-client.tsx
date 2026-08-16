'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  FileText,
  AlertCircle,
  Star,
  Briefcase,
  TrendingUp,
  Filter,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
  metadata?: any;
}

interface NotificationsClientProps {
  notifications: Notification[];
}

const getNotificationIcon = (type: string) => {
  const icons: Record<string, any> = {
    bid_received: Briefcase,
    bid_accepted: CheckCircle2,
    bid_rejected: AlertCircle,
    payment_received: DollarSign,
    payment_released: DollarSign,
    job_completed: CheckCircle2,
    review_received: Star,
    dispute_filed: AlertCircle,
    message_received: MessageSquare,
    quote_received: FileText,
    quote_accepted: CheckCircle2,
    quote_rejected: AlertCircle,
    lead_received: TrendingUp,
  };
  return icons[type] || Bell;
};

const getNotificationColor = (type: string) => {
  const colors: Record<string, string> = {
    bid_received: 'from-blue-500 to-indigo-500',
    bid_accepted: 'from-emerald-500 to-teal-500',
    bid_rejected: 'from-red-500 to-rose-500',
    payment_received: 'from-green-500 to-emerald-500',
    payment_released: 'from-emerald-500 to-teal-500',
    job_completed: 'from-blue-500 to-cyan-500',
    review_received: 'from-amber-500 to-orange-500',
    dispute_filed: 'from-red-500 to-rose-500',
    message_received: 'from-violet-500 to-purple-500',
    quote_received: 'from-indigo-500 to-blue-500',
    quote_accepted: 'from-emerald-500 to-teal-500',
    quote_rejected: 'from-red-500 to-rose-500',
    lead_received: 'from-purple-500 to-pink-500',
  };
  return colors[type] || 'from-slate-500 to-slate-600';
};

export default function NotificationsClient({
  notifications: initialNotifications,
}: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
        });
        setNotifications(
          notifications.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Bell className="h-8 w-8" />
                Notifications
              </h1>
              <p className="text-slate-600 mt-1">
                Stay updated with your marketplace activity
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllRead}
                variant="outline"
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {notifications.length}
                    </p>
                    <p className="text-sm text-slate-600">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {unreadCount}
                    </p>
                    <p className="text-sm text-slate-600">Unread</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList className="bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="py-16">
                <div className="text-center">
                  <Bell className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {filter === 'unread'
                      ? 'All caught up!'
                      : 'No notifications yet'}
                  </h3>
                  <p className="text-slate-600">
                    {filter === 'unread'
                      ? "You've read all your notifications"
                      : "You'll see notifications here when you have activity"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const gradientClass = getNotificationColor(notification.type);

              return (
                <Card
                  key={notification.id}
                  className={`bg-white/80 backdrop-blur-sm border-slate-200 hover:shadow-md transition-all cursor-pointer ${
                    !notification.read ? 'ring-2 ring-blue-200' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-br ${gradientClass} flex-shrink-0`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <Badge className="bg-blue-500 text-white flex-shrink-0">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-600 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-sm text-slate-400">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
