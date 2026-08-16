/**
 * Contractor Background Operations Middleware
 * 
 * Integrates inline background operations into API routes.
 * Runs daily checks, monthly resets, and cleanup operations
 * without blocking user requests.
 * 
 * USAGE:
 * Import and call at the start of contractor API routes:
 * 
 * ```typescript
 * import { runBackgroundOps } from '@/lib/middleware/contractor-background-ops';
 * 
 * export async function GET(request: Request) {
 *   const contractorId = await getContractorId(request);
 *   await runBackgroundOps(contractorId);
 *   
 *   // ... rest of your API logic
 * }
 * ```
 */

import { performDailyCheckIfNeeded } from '../services/contractor-daily-check';
import { checkAndResetMonthlyCounters } from '../services/contractor-monthly-reset';
import { cleanupOldNotifications } from '../services/contractor-notification-cleanup';

// ============= Types =============

export interface BackgroundOpsOptions {
  /**
   * Whether to run daily usage checks
   * @default true
   */
  runDailyCheck?: boolean;
  
  /**
   * Whether to run monthly counter resets
   * @default true
   */
  runMonthlyReset?: boolean;
  
  /**
   * Whether to run notification cleanup
   * @default false (only on notification routes)
   */
  runCleanup?: boolean;
  
  /**
   * Whether to wait for monthly reset to complete
   * @default true (must complete for accurate counters)
   */
  waitForReset?: boolean;
}

export interface BackgroundOpsResult {
  dailyCheckTriggered: boolean;
  monthlyResetPerformed: boolean;
  cleanupTriggered: boolean;
  errors: string[];
}

// ============= Main Function =============

/**
 * Run background operations for a contractor
 * 
 * This function should be called at the start of contractor API routes.
 * It runs various background operations inline with the request:
 * 
 * 1. Daily Check: Checks usage and sends notifications (async, non-blocking)
 * 2. Monthly Reset: Resets counters if billing period ended (sync, blocking)
 * 3. Cleanup: Cleans up old notifications (async, non-blocking, probabilistic)
 * 
 * @param contractorId - The contractor's ID
 * @param options - Configuration options
 * @returns Promise with operation results
 */
export async function runBackgroundOps(
  contractorId: string,
  options: BackgroundOpsOptions = {}
): Promise<BackgroundOpsResult> {
  const {
    runDailyCheck = true,
    runMonthlyReset = true,
    runCleanup = false,
    waitForReset = true,
  } = options;
  
  const result: BackgroundOpsResult = {
    dailyCheckTriggered: false,
    monthlyResetPerformed: false,
    cleanupTriggered: false,
    errors: [],
  };
  
  try {
    // 1. Monthly Reset (MUST run first and synchronously)
    // This ensures counters are accurate before any operations
    if (runMonthlyReset) {
      try {
        const resetResult = await checkAndResetMonthlyCounters(contractorId);
        result.monthlyResetPerformed = resetResult.reset;
        
        if (resetResult.error) {
          result.errors.push(`Monthly reset error: ${resetResult.error}`);
        }
      } catch (error) {
        const errorMsg = `Monthly reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // 2. Daily Check (async, non-blocking)
    if (runDailyCheck) {
      try {
        // This returns immediately, check runs in background
        await performDailyCheckIfNeeded(contractorId);
        result.dailyCheckTriggered = true;
      } catch (error) {
        const errorMsg = `Daily check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // 3. Cleanup (async, non-blocking, probabilistic)
    if (runCleanup) {
      try {
        // This returns immediately, cleanup runs in background
        await cleanupOldNotifications();
        result.cleanupTriggered = true;
      } catch (error) {
        const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Background ops failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }
  
  return result;
}

/**
 * Run background operations for notification routes
 * 
 * This is a convenience function for notification-related routes
 * that includes cleanup operations.
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with operation results
 */
export async function runBackgroundOpsWithCleanup(
  contractorId: string
): Promise<BackgroundOpsResult> {
  return runBackgroundOps(contractorId, {
    runDailyCheck: true,
    runMonthlyReset: true,
    runCleanup: true,
  });
}

/**
 * Run only monthly reset (for routes that modify counters)
 * 
 * This ensures counters are accurate before incrementing.
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with operation results
 */
export async function runMonthlyResetOnly(
  contractorId: string
): Promise<BackgroundOpsResult> {
  return runBackgroundOps(contractorId, {
    runDailyCheck: false,
    runMonthlyReset: true,
    runCleanup: false,
  });
}

/**
 * Run only daily check (for read-only routes)
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with operation results
 */
export async function runDailyCheckOnly(
  contractorId: string
): Promise<BackgroundOpsResult> {
  return runBackgroundOps(contractorId, {
    runDailyCheck: true,
    runMonthlyReset: false,
    runCleanup: false,
  });
}

// ============= Helper Functions =============

/**
 * Extract contractor ID from request
 * 
 * This is a helper function to extract the contractor ID from
 * various sources (session, token, etc.). Implement based on
 * your authentication system.
 * 
 * @param request - The request object
 * @returns Promise with contractor ID or null
 */
export async function getContractorIdFromRequest(
  request: Request
): Promise<string | null> {
  // TODO: Implement based on your authentication system
  // This is a placeholder implementation
  
  try {
    // Example: Extract from session, JWT, etc.
    // const session = await getSession(request);
    // return session?.contractorId || null;
    
    return null;
  } catch (error) {
    console.error('Error extracting contractor ID:', error);
    return null;
  }
}

/**
 * Middleware wrapper for Next.js API routes
 * 
 * This wraps your API handler and automatically runs background ops.
 * 
 * @param handler - Your API route handler
 * @param options - Background ops options
 * @returns Wrapped handler
 */
export function withBackgroundOps(
  handler: (request: Request, context?: any) => Promise<Response>,
  options: BackgroundOpsOptions = {}
) {
  return async (request: Request, context?: any): Promise<Response> => {
    try {
      // Extract contractor ID
      const contractorId = await getContractorIdFromRequest(request);
      
      if (contractorId) {
        // Run background ops
        await runBackgroundOps(contractorId, options);
      }
      
      // Call original handler
      return await handler(request, context);
    } catch (error) {
      console.error('Error in background ops middleware:', error);
      // Continue with original handler even if background ops fail
      return await handler(request, context);
    }
  };
}

/**
 * Check if background operations are healthy
 * 
 * This can be used for health checks and monitoring.
 * 
 * @returns Promise with health status
 */
export async function checkBackgroundOpsHealth(): Promise<{
  healthy: boolean;
  checks: {
    dailyCheck: boolean;
    monthlyReset: boolean;
    cleanup: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const checks = {
    dailyCheck: true,
    monthlyReset: true,
    cleanup: true,
  };
  
  // Add health checks here if needed
  // For example, check if services are responding
  
  return {
    healthy: errors.length === 0,
    checks,
    errors,
  };
}

// ============= Exports =============

export default runBackgroundOps;
