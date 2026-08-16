/**
 * Cron heartbeat wrapper. Wrap scheduled jobs so silent cron failures show up
 * on the super-admin dashboard instead of disappearing.
 *
 * Usage:
 *   return withCronLog('release-escrow', async () => { ... });
 */

import { prisma } from '@/db/prisma';

export async function withCronLog<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = new Date();
  let runId: string | null = null;

  try {
    const row = await prisma.cronRunLog.create({
      data: { jobName, status: 'running', startedAt },
      select: { id: true },
    });
    runId = row.id;
  } catch (error) {
    console.error('cron-log: failed to record start', jobName, error);
  }

  try {
    const result = await fn();
    const finishedAt = new Date();
    if (runId) {
      await prisma.cronRunLog.update({
        where: { id: runId },
        data: {
          status: 'success',
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      }).catch((err) => console.error('cron-log: success update failed', err));
    }
    return result;
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);
    if (runId) {
      await prisma.cronRunLog.update({
        where: { id: runId },
        data: {
          status: 'failure',
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          error: message.slice(0, 2000),
        },
      }).catch((err) => console.error('cron-log: failure update failed', err));
    }
    throw error;
  }
}

export async function recordCronSkip(jobName: string, message: string) {
  try {
    await prisma.cronRunLog.create({
      data: {
        jobName,
        status: 'skipped',
        startedAt: new Date(),
        finishedAt: new Date(),
        durationMs: 0,
        message,
      },
    });
  } catch (error) {
    console.error('cron-log: skip record failed', jobName, error);
  }
}
