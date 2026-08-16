// TypeScript interface for WebSocket server
export interface WebSocketServer {
  broadcastNewMessage(channelId: string, message: any): void;
  broadcastReaction(channelId: string, messageId: string, reaction: string, userId: string): void;
}

// Global variable to store WebSocket server instance
declare global {
  var __wsServer: WebSocketServer | undefined;
}

export function getWebSocketServer(): WebSocketServer | null {
  if (typeof window !== 'undefined') {
    // Client-side, no WebSocket server
    return null;
  }
  
  return (global as any).__wsServer || null;
}