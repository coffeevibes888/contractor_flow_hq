import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { IncomingMessage } from 'http';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  channelId?: string;
  landlordId?: string;
}

interface WebSocketMessage {
  type: 'join_channel' | 'leave_channel' | 'new_message' | 'message_reaction' | 'typing' | 'stop_typing';
  channelId?: string;
  messageId?: string;
  message?: any;
  reaction?: string;
  data?: any;
}

class TeamChatWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('WebSocket server initialized on path: /api/websocket/team-chat');
    
    // Register this instance globally for TypeScript access
    if (typeof global !== 'undefined') {
      (global as any).__wsServer = this;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    console.log('New WebSocket connection attempt');

    try {
      const url = parse(request.url || '', true);
      const token = url.query.token as string;
      
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Simplified auth - in production, verify the token properly
      // For now, we'll accept any non-empty token as the user ID
      ws.userId = token;
      console.log(`User ${ws.userId} connected via WebSocket`);

      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('close', (code, reason) => {
        console.log(`WebSocket closed for user ${ws.userId}: ${code} ${reason}`);
        this.handleDisconnection(ws);
      });
      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${ws.userId}:`, error);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_confirmed',
        userId: ws.userId,
        timestamp: new Date().toISOString()
      }));

      console.log(`WebSocket connection established for user ${ws.userId}`);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Server error');
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: any) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log('Received WebSocket message:', message.type);

      switch (message.type) {
        case 'join_channel':
          this.handleJoinChannel(ws, message.channelId!);
          break;
        case 'leave_channel':
          this.handleLeaveChannel(ws, message.channelId!);
          break;
        case 'new_message':
          this.handleNewMessage(ws, message);
          break;
        case 'message_reaction':
          this.handleMessageReaction(ws, message);
          break;
        case 'typing':
          this.handleTyping(ws, message.channelId!, true);
          break;
        case 'stop_typing':
          this.handleTyping(ws, message.channelId!, false);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private handleJoinChannel(ws: AuthenticatedWebSocket, channelId: string) {
    if (!channelId) return;

    // Add to channel
    ws.channelId = channelId;

    if (!this.clients.has(channelId)) {
      this.clients.set(channelId, new Set());
    }
    this.clients.get(channelId)!.add(ws);

    console.log(`User ${ws.userId} joined channel ${channelId}`);

    ws.send(JSON.stringify({
      type: 'channel_joined',
      channelId
    }));
  }

  private handleLeaveChannel(ws: AuthenticatedWebSocket, channelId: string) {
    const channelClients = this.clients.get(channelId);
    if (channelClients) {
      channelClients.delete(ws);
      if (channelClients.size === 0) {
        this.clients.delete(channelId);
      }
    }
    ws.channelId = undefined;
    console.log(`User ${ws.userId} left channel ${channelId}`);
  }

  private handleNewMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (!ws.channelId || !message.message) return;

    try {
      // Broadcast to other clients in the channel
      this.broadcastToChannel(ws.channelId, {
        type: 'new_message',
        message: message.message
      }, ws);
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  }

  private handleMessageReaction(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (!ws.channelId || !message.messageId || !message.reaction) return;

    try {
      // Broadcast reaction to other clients in the channel
      this.broadcastToChannel(ws.channelId, {
        type: 'message_reaction',
        messageId: message.messageId,
        reaction: message.reaction,
        userId: ws.userId
      }, ws);
    } catch (error) {
      console.error('Error handling message reaction:', error);
    }
  }

  private handleTyping(ws: AuthenticatedWebSocket, channelId: string, isTyping: boolean) {
    if (!ws.channelId || ws.channelId !== channelId) return;

    this.broadcastToChannel(channelId, {
      type: isTyping ? 'user_typing' : 'user_stop_typing',
      userId: ws.userId
    }, ws);
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    console.log(`User ${ws.userId} disconnected`);
    
    if (ws.channelId) {
      this.handleLeaveChannel(ws, ws.channelId);
    }
  }

  private broadcastToChannel(channelId: string, message: any, excludeWs?: AuthenticatedWebSocket) {
    const channelClients = this.clients.get(channelId);
    if (!channelClients) return;

    const messageStr = JSON.stringify(message);
    
    channelClients.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Error sending message to client:', error);
        }
      }
    });
  }

  // Method to broadcast message from REST API
  public broadcastNewMessage(channelId: string, message: any) {
    this.broadcastToChannel(channelId, {
      type: 'new_message',
      message
    });
  }

  public getWss(): WebSocketServer {
    return this.wss;
  }

  // Method to broadcast reaction from REST API
  public broadcastReaction(channelId: string, messageId: string, reaction: string, userId: string) {
    this.broadcastToChannel(channelId, {
      type: 'message_reaction',
      messageId,
      reaction,
      userId
    });
  }
}

let wsServer: TeamChatWebSocketServer | null = null;

export function initializeWebSocketServer(): TeamChatWebSocketServer {
  if (!wsServer) {
    wsServer = new TeamChatWebSocketServer();
  }
  return wsServer;
}

export function handleChatUpgrade(req: IncomingMessage, socket: any, head: Buffer): void {
  const server = wsServer?.getWss();
  if (server) {
    server.handleUpgrade(req, socket, head, (ws: any) => {
      server.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
}

export function getWebSocketServer(): TeamChatWebSocketServer | null {
  return wsServer;
}