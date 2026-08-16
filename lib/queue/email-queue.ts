/**
 * Email Queue Helper
 * Simplifies queueing emails instead of sending synchronously
 */

import { jobQueue } from './redis-queue';
import { ReactElement } from 'react';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  react?: ReactElement;
  from?: string;
  priority?: number;
}

export class EmailQueue {
  /**
   * Queue an email for async delivery
   */
  static async send(options: EmailOptions): Promise<string> {
    return jobQueue.enqueue('send_email', options, {
      priority: options.priority || 5,
      maxRetries: 3,
    });
  }

  /**
   * Queue multiple emails (batch)
   */
  static async sendBatch(emails: EmailOptions[]): Promise<string[]> {
    return Promise.all(emails.map(email => this.send(email)));
  }

  /**
   * Queue email with delay
   */
  static async sendDelayed(options: EmailOptions, delayMs: number): Promise<string> {
    const scheduledFor = new Date(Date.now() + delayMs);
    
    return jobQueue.enqueue('send_email', options, {
      priority: options.priority || 5,
      maxRetries: 3,
      scheduledFor,
    });
  }
}
