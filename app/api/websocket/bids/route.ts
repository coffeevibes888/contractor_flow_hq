import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';

/**
 * WebSocket Bidding System
 * 
 * IMPORTANT: This WebSocket implementation is a placeholder and requires additional setup:
 * 
 * Option 1 (Recommended): Use a separate WebSocket server
 * - Run a standalone Node.js WebSocket server on a different port
 * - Use nginx or similar to proxy WebSocket connections
 * 
 * Option 2: Use a third-party service
 * - Pusher (https://pusher.com)
 * - Ably (https://ably.com)
 * - Socket.io with a custom server
 * 
 * Option 3: Use Server-Sent Events (SSE)
 * - Simpler than WebSockets but one-way communication
 * - Works natively with Next.js App Router
 * 
 * The current implementation uses @ts-expect-error to bypass type checking
 * because Next.js App Router doesn't natively support WebSocket upgrades.
 */

// Store WebSocket connections by user ID and job ID
const connections = new Map<string, Set<any>>();
const jobSubscriptions = new Map<string, Set<string>>(); // jobId -> Set of userIds

// Get or create WebSocket server
let wss: WebSocketServer | null = null;

function getWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    console.log('Bid WebSocket server created');
  }
  return wss;
}

export async function GET(req: NextRequest) {
  const upgradeHeader = req.headers.get('upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 401 });
  }

  const userId = token; // In production, verify JWT token

  try {
    const wss = getWebSocketServer();

    // @ts-expect-error - WebSocket upgrade in Next.js App Router requires custom server
    // This code is a placeholder and won't work in production without a custom Node.js server
    // Consider using: 1) Separate WebSocket server, 2) Pusher/Ably, or 3) Server-Sent Events
    const { socket, response } = await req.socket;

    // @ts-expect-error - Type mismatch between NextRequest and IncomingMessage
    wss.handleUpgrade(req, socket, Buffer.alloc(0), (ws) => {
      console.log(`Bid WebSocket client connected: ${userId}`);

      // Store connection
      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId)!.add(ws);

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: 'connection_confirmed',
          userId,
        })
      );

      // Handle messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Bid WebSocket message received:', message.type);

          switch (message.type) {
            case 'subscribe_job':
              handleSubscribeJob(userId, message.jobId);
              break;
            case 'unsubscribe_job':
              handleUnsubscribeJob(userId, message.jobId);
              break;
            case 'new_bid':
              broadcastNewBid(message.bid);
              break;
            case 'bid_accepted':
              broadcastBidAccepted(message.bidId, message.jobId);
              break;
            case 'bid_rejected':
              broadcastBidRejected(message.bidId, message.jobId);
              break;
            case 'bid_withdrawn':
              broadcastBidWithdrawn(message.bidId, message.jobId);
              break;
            default:
              console.log('Unknown Bid WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error handling Bid WebSocket message:', error);
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Invalid message format',
            })
          );
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`Bid WebSocket client disconnected: ${userId}`);
        
        // Remove connection
        const userConnections = connections.get(userId);
        if (userConnections) {
          userConnections.delete(ws);
          if (userConnections.size === 0) {
            connections.delete(userId);
          }
        }

        // Remove job subscriptions
        jobSubscriptions.forEach((subscribers, jobId) => {
          subscribers.delete(userId);
          if (subscribers.size === 0) {
            jobSubscriptions.delete(jobId);
          }
        });
      });

      ws.on('error', (error) => {
        console.error('Bid WebSocket error:', error);
      });
    });

    return response;
  } catch (error) {
    console.error('Bid WebSocket upgrade error:', error);
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
}

// Helper functions
function handleSubscribeJob(userId: string, jobId: string) {
  if (!jobSubscriptions.has(jobId)) {
    jobSubscriptions.set(jobId, new Set());
  }
  jobSubscriptions.get(jobId)!.add(userId);
  console.log(`User ${userId} subscribed to job ${jobId}`);
}

function handleUnsubscribeJob(userId: string, jobId: string) {
  const subscribers = jobSubscriptions.get(jobId);
  if (subscribers) {
    subscribers.delete(userId);
    if (subscribers.size === 0) {
      jobSubscriptions.delete(jobId);
    }
  }
  console.log(`User ${userId} unsubscribed from job ${jobId}`);
}

function broadcastNewBid(bid: any) {
  const jobId = bid.jobId;
  const subscribers = jobSubscriptions.get(jobId);

  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'new_bid',
    bid,
  });

  subscribers.forEach((userId) => {
    const userConnections = connections.get(userId);
    if (userConnections) {
      userConnections.forEach((ws) => {
        if (ws.readyState === 1) {
          // OPEN
          ws.send(message);
        }
      });
    }
  });

  console.log(`Broadcasted new bid for job ${jobId} to ${subscribers.size} users`);
}

function broadcastBidAccepted(bidId: string, jobId: string) {
  const subscribers = jobSubscriptions.get(jobId);

  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'bid_accepted',
    bidId,
    jobId,
  });

  subscribers.forEach((userId) => {
    const userConnections = connections.get(userId);
    if (userConnections) {
      userConnections.forEach((ws) => {
        if (ws.readyState === 1) {
          ws.send(message);
        }
      });
    }
  });

  console.log(`Broadcasted bid accepted for job ${jobId}`);
}

function broadcastBidRejected(bidId: string, jobId: string) {
  const subscribers = jobSubscriptions.get(jobId);

  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'bid_rejected',
    bidId,
    jobId,
  });

  subscribers.forEach((userId) => {
    const userConnections = connections.get(userId);
    if (userConnections) {
      userConnections.forEach((ws) => {
        if (ws.readyState === 1) {
          ws.send(message);
        }
      });
    }
  });

  console.log(`Broadcasted bid rejected for job ${jobId}`);
}

function broadcastBidWithdrawn(bidId: string, jobId: string) {
  const subscribers = jobSubscriptions.get(jobId);

  if (!subscribers) return;

  const message = JSON.stringify({
    type: 'bid_withdrawn',
    bidId,
    jobId,
  });

  subscribers.forEach((userId) => {
    const userConnections = connections.get(userId);
    if (userConnections) {
      userConnections.forEach((ws) => {
        if (ws.readyState === 1) {
          ws.send(message);
        }
      });
    }
  });

  console.log(`Broadcasted bid withdrawn for job ${jobId}`);
}
