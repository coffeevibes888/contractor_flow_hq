/**
 * Enhanced WebSocket Server with Real-Time Notifications
 * Extends the existing team chat WebSocket to support system-wide notifications
 */

import { WebSocket } from 'ws';
import { getWebSocketServer } from '@/lib/websocket-server';

export interface NotificationMessage {
  type: 'notification' | 'reminder' | 'alert' | 'payment' | 'lease_update' | 'appointment';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
  timestamp: Date;
}

/**
 * Send real-time notification to a specific user
 */
export async function sendRealtimeNotification(
  userId: string,
  notification: NotificationMessage
) {
  const wsServer = getWebSocketServer();
  
  if (!wsServer) {
    console.warn('WebSocket server not initialized');
    return false;
  }

  try {
    // Broadcast to user's personal channel
    wsServer.broadcastNewMessage(`user-${userId}`, {
      ...notification,
      timestamp: notification.timestamp.toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Failed to send real-time notification:', error);
    return false;
  }
}

/**
 * Send real-time notification to all landlord's team members
 */
export async function sendRealtimeNotificationToTeam(
  landlordId: string,
  notification: NotificationMessage
) {
  const wsServer = getWebSocketServer();
  
  if (!wsServer) {
    console.warn('WebSocket server not initialized');
    return false;
  }

  try {
    // Broadcast to landlord's team channel
    wsServer.broadcastNewMessage(`landlord-${landlordId}`, {
      ...notification,
      timestamp: notification.timestamp.toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Failed to send real-time notification to team:', error);
    return false;
  }
}

/**
 * Broadcast system-wide announcement
 */
export async function broadcastSystemAnnouncement(
  announcement: NotificationMessage
) {
  const wsServer = getWebSocketServer();
  
  if (!wsServer) {
    console.warn('WebSocket server not initialized');
    return false;
  }

  try {
    // Broadcast to system channel
    wsServer.broadcastNewMessage('system', {
      ...announcement,
      timestamp: announcement.timestamp.toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Failed to broadcast system announcement:', error);
    return false;
  }
}
