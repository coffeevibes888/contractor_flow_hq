/**
 * Redis-based Job Queue for Vercel
 * Uses Upstash Redis for serverless compatibility
 * Replaces database-backed queue for better performance
 */

import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client (optional - only needed for production queue system)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export type JobType =
  | 'send_email'
  | 'generate_pdf'
  | 'process_ocr'
  | 'send_notification'
  | 'process_webhook'
  | 'stripe_operation'
  | 'cleanup_documents'
  | 'daily_check'
  | 'monthly_reset';

export interface Job<T = any> {
  id: string;
  type: JobType;
  payload: T;
  priority: number;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  scheduledFor?: number;
}

class RedisJobQueue {
  private readonly QUEUE_KEY = 'jobs:queue';
  private readonly PROCESSING_KEY = 'jobs:processing';
  private readonly FAILED_KEY = 'jobs:failed';
  private readonly COMPLETED_KEY = 'jobs:completed';

  /**
   * Add job to queue
   */
  async enqueue<T = any>(
    type: JobType,
    payload: T,
    options: {
      priority?: number;
      maxRetries?: number;
      scheduledFor?: Date;
    } = {}
  ): Promise<string> {
    if (!redis) {
      console.warn('[Redis Queue] Redis not configured, skipping job enqueue:', type);
      return `skipped:${type}:${Date.now()}`;
    }

    const jobId = `${type}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job<T> = {
      id: jobId,
      type,
      payload,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      createdAt: Date.now(),
      scheduledFor: options.scheduledFor?.getTime(),
    };

    // Add to sorted set with priority as score
    await redis.zadd(this.QUEUE_KEY, {
      score: job.priority,
      member: JSON.stringify(job),
    });

    return jobId;
  }

  /**
   * Get next job from queue
   */
  async dequeue(): Promise<Job | null> {
    if (!redis) {
      return null;
    }

    // Get highest priority job
    const jobs = await redis.zrange(this.QUEUE_KEY, 0, 0);
    
    if (!jobs || jobs.length === 0) {
      return null;
    }

    const jobData = jobs[0];
    const job: Job = JSON.parse(jobData as string);

    // Check if scheduled for future
    if (job.scheduledFor && job.scheduledFor > Date.now()) {
      return null;
    }

    // Move to processing
    await redis.zrem(this.QUEUE_KEY, jobData);
    await redis.setex(`${this.PROCESSING_KEY}:${job.id}`, 300, JSON.stringify(job));

    return job;
  }

  /**
   * Mark job as completed
   */
  async complete(jobId: string): Promise<void> {
    if (!redis) {
      return;
    }

    await redis.del(`${this.PROCESSING_KEY}:${jobId}`);
    await redis.setex(`${this.COMPLETED_KEY}:${jobId}`, 3600, Date.now().toString());
  }

  /**
   * Mark job as failed and retry if possible
   */
  async fail(job: Job, error: string): Promise<void> {
    if (!redis) {
      return;
    }

    await redis.del(`${this.PROCESSING_KEY}:${job.id}`);

    if (job.retryCount < job.maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, job.retryCount) * 1000;
      job.retryCount++;
      job.scheduledFor = Date.now() + delay;

      await redis.zadd(this.QUEUE_KEY, {
        score: job.priority - 1, // Lower priority for retries
        member: JSON.stringify(job),
      });
    } else {
      // Move to failed queue
      await redis.setex(
        `${this.FAILED_KEY}:${job.id}`,
        86400,
        JSON.stringify({ job, error, failedAt: Date.now() })
      );
    }
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
  }> {
    if (!redis) {
      return { pending: 0, processing: 0, failed: 0 };
    }

    const [pending, processingKeys, failedKeys] = await Promise.all([
      redis.zcard(this.QUEUE_KEY),
      redis.keys(`${this.PROCESSING_KEY}:*`),
      redis.keys(`${this.FAILED_KEY}:*`),
    ]);

    return {
      pending: pending || 0,
      processing: processingKeys?.length || 0,
      failed: failedKeys?.length || 0,
    };
  }

  /**
   * Clear all queues (use with caution)
   */
  async clear(): Promise<void> {
    if (!redis) {
      return;
    }

    await redis.del(this.QUEUE_KEY);
    const processingKeys = await redis.keys(`${this.PROCESSING_KEY}:*`);
    const failedKeys = await redis.keys(`${this.FAILED_KEY}:*`);
    
    if (processingKeys && processingKeys.length > 0) {
      await redis.del(...processingKeys);
    }
    if (failedKeys && failedKeys.length > 0) {
      await redis.del(...failedKeys);
    }
  }
}

export const jobQueue = new RedisJobQueue();
