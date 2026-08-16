/**
 * Event System - Main Entry Point
 * Initialize the event-driven system that replaces cron jobs
 */

import { eventBus } from './event-bus';
import { jobQueue } from './job-queue';
import { initializeEventHandlers } from './event-handlers';

let initialized = false;

/**
 * Initialize the entire event system
 * Call this once when your server starts
 */
export async function initializeEventSystem() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (initialized) {
    if (isDev) console.log('Event system already initialized');
    return;
  }

  if (isDev) console.log('Initializing event-driven system...');

  try {
    // 1. Initialize event handlers
    initializeEventHandlers();

    // 2. Process any backlog of unprocessed events
    await eventBus.processBacklog();

    // 3. Start the job queue processor
    jobQueue.startProcessing(30000); // Process every 30 seconds

    initialized = true;
    if (isDev) {
      console.log('✅ Event-driven system initialized successfully');
      console.log('   - Event handlers registered');
      console.log('   - Job queue processor started');
      console.log('   - Backlog processed');
    }
  } catch (error) {
    console.error('❌ Failed to initialize event system:', error);
    throw error;
  }
}

/**
 * Shutdown the event system gracefully
 */
export function shutdownEventSystem() {
  if (!initialized) return;

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) console.log('Shutting down event system...');
  jobQueue.stopProcessing();
  initialized = false;
  if (isDev) console.log('Event system shut down');
}

// Export all components
export { eventBus } from './event-bus';
export { jobQueue } from './job-queue';
export { dbTriggers } from './database-triggers';
export { sendRealtimeNotification, sendRealtimeNotificationToTeam } from './enhanced-websocket';
export type { SystemEvent, EventPayload } from './event-bus';
export type { JobType, JobData } from './job-queue';
