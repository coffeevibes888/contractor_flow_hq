'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Bid {
  id: string;
  jobId: string;
  contractorId: string;
  bidAmount: number;
  bidMessage: string | null;
  deliveryDays: number | null;
  status: string;
  createdAt: string;
  contractor: {
    id: string;
    businessName: string | null;
    displayName: string | null;
    avgRating: number;
    totalReviews: number;
    completedJobs: number;
  };
}

interface WebSocketMessage {
  type: string;
  jobId?: string;
  bid?: Bid;
  bidId?: string;
  userId?: string;
  data?: any;
}

interface UseBidWebSocketProps {
  onNewBid?: (bid: Bid) => void;
  onBidAccepted?: (bidId: string, jobId: string) => void;
  onBidRejected?: (bidId: string, jobId: string) => void;
  onBidWithdrawn?: (bidId: string, jobId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useBidWebSocket({
  onNewBid,
  onBidAccepted,
  onBidRejected,
  onBidWithdrawn,
  onConnectionChange,
}: UseBidWebSocketProps = {}) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedJobs, setSubscribedJobs] = useState<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!session?.user?.id || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('Bid WebSocket already connecting, skipping...');
      return;
    }

    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/websocket/bids?token=${encodeURIComponent(
        session.user.id
      )}`;

      console.log('Connecting to Bid WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Bid WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);

        // Resubscribe to jobs after reconnection
        subscribedJobs.forEach((jobId) => {
          sendMessage({
            type: 'subscribe_job',
            jobId,
          });
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('Bid WebSocket message received:', message.type);

          switch (message.type) {
            case 'connection_confirmed':
              console.log('Bid WebSocket connection confirmed');
              break;
            case 'new_bid':
              if (message.bid) {
                onNewBid?.(message.bid);
              }
              break;
            case 'bid_accepted':
              if (message.bidId && message.jobId) {
                onBidAccepted?.(message.bidId, message.jobId);
              }
              break;
            case 'bid_rejected':
              if (message.bidId && message.jobId) {
                onBidRejected?.(message.bidId, message.jobId);
              }
              break;
            case 'bid_withdrawn':
              if (message.bidId && message.jobId) {
                onBidWithdrawn?.(message.bidId, message.jobId);
              }
              break;
            case 'error':
              console.error('Bid WebSocket error:', message);
              break;
            default:
              console.log('Unknown Bid WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing Bid WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Bid WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        onConnectionChange?.(false);

        // Attempt to reconnect if not a normal closure
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(
            `Attempting to reconnect Bid WebSocket in ${delay}ms (attempt ${
              reconnectAttemptsRef.current + 1
            })`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log('Max Bid WebSocket reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Bid WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create Bid WebSocket connection:', error);
    }
  }, [
    session?.user?.id,
    onNewBid,
    onBidAccepted,
    onBidRejected,
    onBidWithdrawn,
    onConnectionChange,
    subscribedJobs,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Normal closure');
      wsRef.current = null;
    }

    setIsConnected(false);
    setSubscribedJobs(new Set());
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('Bid WebSocket not connected, message not sent');
      return false;
    }
  }, []);

  const subscribeToJob = useCallback(
    (jobId: string) => {
      if (subscribedJobs.has(jobId)) return;

      setSubscribedJobs((prev) => new Set(prev).add(jobId));
      sendMessage({
        type: 'subscribe_job',
        jobId,
      });
    },
    [subscribedJobs, sendMessage]
  );

  const unsubscribeFromJob = useCallback(
    (jobId: string) => {
      if (!subscribedJobs.has(jobId)) return;

      setSubscribedJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });

      sendMessage({
        type: 'unsubscribe_job',
        jobId,
      });
    },
    [subscribedJobs, sendMessage]
  );

  const broadcastNewBid = useCallback(
    (bid: Bid) => {
      sendMessage({
        type: 'new_bid',
        bid,
      });
    },
    [sendMessage]
  );

  const broadcastBidAccepted = useCallback(
    (bidId: string, jobId: string) => {
      sendMessage({
        type: 'bid_accepted',
        bidId,
        jobId,
      });
    },
    [sendMessage]
  );

  const broadcastBidRejected = useCallback(
    (bidId: string, jobId: string) => {
      sendMessage({
        type: 'bid_rejected',
        bidId,
        jobId,
      });
    },
    [sendMessage]
  );

  const broadcastBidWithdrawn = useCallback(
    (bidId: string, jobId: string) => {
      sendMessage({
        type: 'bid_withdrawn',
        bidId,
        jobId,
      });
    },
    [sendMessage]
  );

  // Connect when session is available
  useEffect(() => {
    if (session?.user?.id) {
      const connectTimeout = setTimeout(() => {
        connect();
      }, 500);

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
    subscribedJobs: Array.from(subscribedJobs),
    subscribeToJob,
    unsubscribeFromJob,
    broadcastNewBid,
    broadcastBidAccepted,
    broadcastBidRejected,
    broadcastBidWithdrawn,
    connect,
    disconnect,
  };
}
