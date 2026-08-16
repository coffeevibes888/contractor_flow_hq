/**
 * Vercel Cron Job - Process Background Jobs
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-jobs",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/queue/redis-queue';
import { processJob } from '@/lib/queue/job-processors';
import { withCronLog } from '@/lib/ops/cron-log';

export const maxDuration = 60; // 60 seconds max
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await withCronLog('process-jobs', async () => {
      const startTime = Date.now();
      const maxProcessingTime = 50000; // 50 seconds (leave buffer)
      let processedCount = 0;
      let failedCount = 0;

      while (Date.now() - startTime < maxProcessingTime) {
        const job = await jobQueue.dequeue();
        if (!job) break;

        try {
          await processJob(job);
          await jobQueue.complete(job.id);
          processedCount++;
        } catch (error: any) {
          await jobQueue.fail(job, error.message);
          failedCount++;
          console.error(`Job ${job.id} failed:`, error);
        }
      }

      const stats = await jobQueue.getStats();
      return NextResponse.json({
        success: true,
        processed: processedCount,
        failed: failedCount,
        duration: Date.now() - startTime,
        queueStats: stats,
      });
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
