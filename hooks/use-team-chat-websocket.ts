'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
  reactions: any[];
  attachments: any[];
}

interface WebSocketMessage {
  type: string;
  channelId?: string;
  messageId?: string;
  message?: Message;
  reaction?: string;
  userId?: string;
  data?: any;
}

interface UseTeamChatWebSocketProps {
  onNewMessage?: (message: Message) => void;
  onMessageReaction?: (messageId: string, reaction: string, userId: string) => void;
  onUserTyping?: (userId: string) => void;
  onUserStopTyping?: (userId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useTeamChatWebSocket({
  onNewMessage,
  onMessageReaction,
  onUserTyping,
  onUserStopTyping,
  onConnectionChange
}: UseTeamChatWebSocketProps = {}) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!session?.user?.id || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      if (process.env.NODE_ENV === 'development') {
        console.log('WebSocket already connecting, skipping...');
      }
      return;
    }

    try {
      // Create WebSocket connection with user token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/websocket/team-chat?token=${encodeURIComponent(session.user.id)}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Connecting to WebSocket:', wsUrl);
      }
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('WebSocket connected');
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message.type);

          switch (message.type) {
            case 'connection_confirmed':
              console.log('WebSocket connection confirmed');
              break;
            case 'new_message':
              if (message.message) {
                onNewMessage?.(message.message);
              }
              break;
            case 'message_reaction':
              if (message.messageId && message.reaction && message.userId) {
                onMessageReaction?.(message.messageId, message.reaction, message.userId);
              }
              break;
            case 'user_typing':
              if (message.userId) {
                onUserTyping?.(message.userId);
              }
              break;
            case 'user_stop_typing':
              if (message.userId) {
                onUserStopTyping?.(message.userId);
              }
              break;
            case 'error':
              console.error('WebSocket error:', message);
              break;
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('WebSocket disconnected:', event.code, event.reason);
        }
        setIsConnected(false);
        onConnectionChange?.(false);

        // Don't attempt to reconnect if it's a normal closure or if we've never successfully connected
        // This prevents endless reconnection attempts when the WebSocket server isn't running
        if (event.code !== 1000 && reconnectAttemptsRef.current > 0 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          if (process.env.NODE_ENV === 'development') {
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        // Silently handle WebSocket errors - they're expected when the server isn't running
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('WebSocket connection failed (this is normal if WebSocket server is not running)');
        }
      };

    } catch (error) {
      // Silently handle connection errors - WebSocket server may not be running
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to create WebSocket connection (this is normal if WebSocket server is not running)');
      }
    }
  }, [session?.user?.id, onNewMessage, onMessageReaction, onUserTyping, onUserStopTyping, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Normal closure');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setCurrentChannelId(null);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, message not sent');
      return false;
    }
  }, []);

  const joinChannel = useCallback((channelId: string) => {
    if (currentChannelId === channelId) return;
    
    // Leave current channel if any
    if (currentChannelId) {
      const success = sendMessage({
        type: 'leave_channel',
        channelId: currentChannelId
      });
      if (!success) {
        console.log('Could not leave channel via WebSocket (disconnected)');
      }
    }

    // Join new channel
    setCurrentChannelId(channelId);
    const success = sendMessage({
      type: 'join_channel',
      channelId
    });
    if (!success) {
      console.log('Could not join channel via WebSocket (disconnected)');
    }
  }, [currentChannelId, sendMessage]);

  const leaveChannel = useCallback(() => {
    if (currentChannelId) {
      const success = sendMessage({
        type: 'leave_channel',
        channelId: currentChannelId
      });
      if (!success) {
        console.log('Could not leave channel via WebSocket (disconnected)');
      }
      setCurrentChannelId(null);
    }
  }, [currentChannelId, sendMessage]);

  const broadcastNewMessage = useCallback((message: Message) => {
    sendMessage({
      type: 'new_message',
      message
    });
  }, [sendMessage]);

  const broadcastReaction = useCallback((messageId: string, reaction: string) => {
    sendMessage({
      type: 'message_reaction',
      messageId,
      reaction
    });
  }, [sendMessage]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (currentChannelId) {
      sendMessage({
        type: isTyping ? 'typing' : 'stop_typing',
        channelId: currentChannelId
      });
    }
  }, [currentChannelId, sendMessage]);

  // Connect when session is available (with debounce to prevent rapid connections)
  useEffect(() => {
    if (session?.user?.id) {
      // Debounce connection attempts
      const connectTimeout = setTimeout(() => {
        connect();
      }, 500); // Wait 500ms before connecting

      return () => {
        clearTimeout(connectTimeout);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    currentChannelId,
    joinChannel,
    leaveChannel,
    broadcastNewMessage,
    broadcastReaction,
    sendTyping,
    connect,
    disconnect
  };
}