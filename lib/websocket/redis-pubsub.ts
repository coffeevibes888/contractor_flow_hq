/**
 * Redis Pub/Sub for WebSocket
 * Enables distributed WebSocket across multiple Vercel instances
 */

import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export interface WebSocketMessage {
  type: string;
  channelId?: string;
  userId?: string;
  data: any;
}

export class RedisPubSub {
  /**
   * Publish message to channel
   */
  static async publish(channel: string, message: WebSocketMessage): Promise<void> {
    if (!redis) {
      console.warn('[Redis PubSub] Redis not configured, skipping publish');
      return;
    }

    try {
      await redis.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('Redis publish error:', error);
    }
  }

  /**
   * Broadcast to all users in a channel
   */
  static async broadcastToChannel(channelId: string, message: any): Promise<void> {
    await this.publish(`channel:${channelId}`, {
      type: 'broadcast',
      channelId,
      data: message,
    });
  }

  /**
   * Send message to specific user
   */
  static async sendToUser(userId: string, message: any): Promise<void> {
    await this.publish(`user:${userId}`, {
      type: 'direct',
      userId,
      data: message,
    });
  }

  /**
   * Store active connection
   */
  static async addConnection(userId: string, connectionId: string): Promise<void> {
    if (!redis) return;
    await redis.sadd(`connections:${userId}`, connectionId);
    await redis.expire(`connections:${userId}`, 3600); // 1 hour TTL
  }

  /**
   * Remove connection
   */
  static async removeConnection(userId: string, connectionId: string): Promise<void> {
    if (!redis) return;
    await redis.srem(`connections:${userId}`, connectionId);
  }

  /**
   * Get user connections
   */
  static async getUserConnections(userId: string): Promise<string[]> {
    if (!redis) return [];
    const connections = await redis.smembers(`connections:${userId}`);
    return connections as string[];
  }

  /**
   * Check if user is online
   */
  static async isUserOnline(userId: string): Promise<boolean> {
    const connections = await this.getUserConnections(userId);
    return connections.length > 0;
  }
}
