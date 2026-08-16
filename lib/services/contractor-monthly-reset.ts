/**
 * Contractor Monthly Reset Service
 * 
 * Resets monthly counters inline with user requests (no cron jobs).
 * Checks if billing period has ended and resets counters accordingly.
 * Sends monthly usage summary emails.
 * 
 * TRIGGER: On first API request after billing period ends
 * FREQUENCY: Once per month per contractor
 * EXECUTION: Synchronous (must complete before request proceeds)
 */

import { prisma } from '@/db/prisma';
import { resetMonthlyCounters, getCurrentUsage } from './contractor-usage-tracker';
import { CONTRACTOR_TIERS } from '@/lib/config/contractor-subscription-tiers';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import ContractorMonthlySummaryEmail from '@/email/templates/contractor-monthly-summary';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);
const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Property Flow HQ';

// ============= Types =============

interface MonthlyResetResult {
  reset: boolean;
  previousUsage?: {
    invoicesThisMonth: number;
  };
  error?: string;
}

interface MonthlySummaryData {
  contractorName: string;
  contractorEmail: string;
  tier: string;
  period: {
    start: string;
    end: string;
  };
  usage: {
    invoices: number;
    invoiceLimit: number;
    jobs: number;
    jobLimit: number;
    customers: number;
    customerLimit: number;
  };
  approachingLimits: Array<{
    feature: string;
    current: number;
    limit: number;
    percentage: number;
  }>;
}

// ============= Helper Functions =============

/**
 * Check if billing period has ended
 * Returns true if current date is past the billing period end date
 */
function hasBillingPeriodEnded(subscriptionEndsAt: Date | null): boolean {
  if (!subscriptionEndsAt) return false;
  return new Date() >= subscriptionEndsAt;
}

/**
 * Calculate next billing period end date (30 days from now)
 */
function calculateNextBillingPeriod(): Date {
  const nextPeriod = new Date();
  nextPeriod.setDate(nextPeriod.getDate() + 30);
  return nextPeriod;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format limit for display
 */
function formatLimit(limit: number): string {
  return limit === -1 ? 'Unlimited' : limit.toString();
}

/**
 * Send monthly usage summary email
 */
async function sendMonthlySummaryEmail(data: MonthlySummaryData): Promise<void> {
  const { contractorName, contractorEmail, tier, period, usage, approachingLimits } = data;
  
  // Build email HTML
  const approachingLimitsHtml = approachingLimits.length > 0
    ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Approaching Limits</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${approachingLimits.map(item => `
            <li style="margin: 5px 0;">
              <strong>${item.feature}:</strong> ${item.current} of ${formatLimit(item.limit)} (${item.percentage}%)
            </li>
          `).join('')}
        </ul>
        <p style="margin: 10px 0 0 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor/settings/subscription" 
             style="color: #007bff; text-decoration: none;">
            Consider upgrading to avoid interruptions →
          </a>
        </p>
      </div>
    `
    : '';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monthly Usage Summary</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h1 style="color: #2c3e50; margin: 0 0 10px 0;">📊 Monthly Usage Summary</h1>
          <p style="color: #6c757d; margin: 0 0 20px 0;">
            ${period.start} - ${period.end}
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #495057;">Hello ${contractorName}!</h2>
            <p style="margin: 0 0 10px 0;">
              Here's your usage summary for the past billing period on your <strong>${tier}</strong> plan.
            </p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #495057;">Usage Statistics</h3>
            
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Invoices:</strong></span>
                <span>${usage.invoices} / ${formatLimit(usage.invoiceLimit)}</span>
              </div>
              <div style="background-color: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background-color: #28a745; height: 100%; width: ${usage.invoiceLimit === -1 ? 0 : Math.min(100, (usage.invoices / usage.invoiceLimit) * 100)}%;"></div>
              </div>
            </div>
            
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Active Jobs:</strong></span>
                <span>${usage.jobs} / ${formatLimit(usage.jobLimit)}</span>
              </div>
              <div style="background-color: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background-color: #007bff; height: 100%; width: ${usage.jobLimit === -1 ? 0 : Math.min(100, (usage.jobs / usage.jobLimit) * 100)}%;"></div>
              </div>
            </div>
            
            <div style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span><strong>Customers:</strong></span>
                <span>${usage.customers} / ${formatLimit(usage.customerLimit)}</span>
              </div>
              <div style="background-color: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background-color: #17a2b8; height: 100%; width: ${usage.customerLimit === -1 ? 0 : Math.min(100, (usage.customers / usage.customerLimit) * 100)}%;"></div>
              </div>
            </div>
          </div>
          
          ${approachingLimitsHtml}
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #495057;">What's Next?</h3>
            <p style="margin: 0 0 10px 0;">
              Your monthly invoice counter has been reset for the new billing period.
            </p>
            <p style="margin: 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor/dashboard" 
                 style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">
                View Dashboard
              </a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 20px;">
            <p style="margin: 0 0 5px 0;">
              Questions? Contact us at <a href="mailto:support@example.com" style="color: #007bff;">support@example.com</a>
            </p>
            <p style="margin: 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor/settings/subscription" style="color: #007bff;">Manage Subscription</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${senderEmail}>`,
      to: contractorEmail,
      subject: `📊 Monthly Usage Summary - ${tier} Plan`,
      html,
    });
    
    if (error) {
      console.error('Error sending monthly summary email:', error);
      throw error;
    }
    
    console.log(`Sent monthly summary email to ${contractorEmail}`);
  } catch (error) {
    console.error('Error sending monthly summary email:', error);
    throw error;
  }
}

// ============= Main Reset Logic =============

/**
 * Check and reset monthly counters if billing period has ended
 * 
 * This function should be called on every contractor API request.
 * It checks if the billing period has ended, and if so, resets
 * the monthly counters and sends a usage summary email.
 * 
 * This operation is synchronous and must complete before the
 * request proceeds to ensure accurate counter values.
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with reset result
 */
export async function checkAndResetMonthlyCounters(
  contractorId: string
): Promise<MonthlyResetResult> {
  try {
    // Get contractor subscription info
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        businessName: true,
        email: true,
        subscriptionTier: true,
        subscriptionEndsAt: true,
      },
    });
    
    if (!contractor) {
      return {
        reset: false,
        error: 'Contractor not found',
      };
    }
    
    // Check if billing period has ended
    if (!hasBillingPeriodEnded(contractor.subscriptionEndsAt)) {
      return {
        reset: false,
      };
    }
    
    console.log(`Billing period ended for contractor ${contractorId}, resetting counters...`);
    
    // Get current usage before reset (for summary email)
    const currentUsage = await getCurrentUsage(contractorId);
    const tier = contractor.subscriptionTier || 'starter';
    const tierConfig = CONTRACTOR_TIERS[tier as keyof typeof CONTRACTOR_TIERS];
    
    // Calculate period dates
    const periodEnd = contractor.subscriptionEndsAt || new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 30);
    
    // Check which features are approaching limits
    const approachingLimits: Array<{
      feature: string;
      current: number;
      limit: number;
      percentage: number;
    }> = [];
    
    if (tierConfig) {
      const checks = [
        { feature: 'Active Jobs', current: currentUsage.activeJobsCount, limit: tierConfig.limits.activeJobs },
        { feature: 'Customers', current: currentUsage.totalCustomers, limit: tierConfig.limits.customers },
        { feature: 'Team Members', current: currentUsage.teamMembersCount, limit: tierConfig.limits.teamMembers },
        { feature: 'Inventory Items', current: currentUsage.inventoryCount, limit: tierConfig.limits.inventoryItems },
        { feature: 'Equipment Items', current: currentUsage.equipmentCount, limit: tierConfig.limits.equipmentItems },
        { feature: 'Active Leads', current: currentUsage.activeLeadsCount, limit: tierConfig.limits.activeLeads },
      ];
      
      for (const check of checks) {
        if (check.limit !== -1 && check.limit > 0) {
          const percentage = Math.round((check.current / check.limit) * 100);
          if (percentage >= 80) {
            approachingLimits.push({
              feature: check.feature,
              current: check.current,
              limit: check.limit,
              percentage,
            });
          }
        }
      }
    }
    
    // Reset monthly counters in database
    await resetMonthlyCounters(contractorId);
    
    // Update billing period end date
    const nextPeriodEnd = calculateNextBillingPeriod();
    await prisma.contractorProfile.update({
      where: { id: contractorId },
      data: {
        subscriptionEndsAt: nextPeriodEnd,
      },
    });
    
    // Send monthly summary email (async, don't block)
    sendMonthlySummaryEmail({
      contractorName: contractor.businessName,
      contractorEmail: contractor.email,
      tier: tierConfig?.name || tier,
      period: {
        start: formatDate(periodStart),
        end: formatDate(periodEnd),
      },
      usage: {
        invoices: currentUsage.invoicesThisMonth,
        invoiceLimit: tierConfig?.limits.invoicesPerMonth || -1,
        jobs: currentUsage.activeJobsCount,
        jobLimit: tierConfig?.limits.activeJobs || -1,
        customers: currentUsage.totalCustomers,
        customerLimit: tierConfig?.limits.customers || -1,
      },
      approachingLimits,
    }).catch(error => {
      console.error('Error sending monthly summary email:', error);
      // Don't throw - reset already succeeded
    });
    
    console.log(`Successfully reset monthly counters for contractor ${contractorId}`);
    
    return {
      reset: true,
      previousUsage: {
        invoicesThisMonth: currentUsage.invoicesThisMonth,
      },
    };
  } catch (error) {
    console.error(`Error in monthly reset for contractor ${contractorId}:`, error);
    return {
      reset: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Force a monthly reset (for testing or manual triggers)
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with reset result
 */
export async function forceMonthlyReset(contractorId: string): Promise<MonthlyResetResult> {
  try {
    // Get current usage before reset
    const currentUsage = await getCurrentUsage(contractorId);
    
    // Reset counters
    await resetMonthlyCounters(contractorId);
    
    // Update billing period
    const nextPeriodEnd = calculateNextBillingPeriod();
    await prisma.contractorProfile.update({
      where: { id: contractorId },
      data: {
        subscriptionEndsAt: nextPeriodEnd,
      },
    });
    
    console.log(`Forced monthly reset for contractor ${contractorId}`);
    
    return {
      reset: true,
      previousUsage: {
        invoicesThisMonth: currentUsage.invoicesThisMonth,
      },
    };
  } catch (error) {
    console.error(`Error in forced monthly reset for contractor ${contractorId}:`, error);
    return {
      reset: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get next reset date for a contractor
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with next reset date or null
 */
export async function getNextResetDate(contractorId: string): Promise<Date | null> {
  try {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: contractorId },
      select: {
        subscriptionEndsAt: true,
      },
    });
    
    return contractor?.subscriptionEndsAt || null;
  } catch (error) {
    console.error(`Error getting next reset date for contractor ${contractorId}:`, error);
    return null;
  }
}

/**
 * Get days until next reset
 * 
 * @param contractorId - The contractor's ID
 * @returns Promise with days until reset or null
 */
export async function getDaysUntilReset(contractorId: string): Promise<number | null> {
  try {
    const nextResetDate = await getNextResetDate(contractorId);
    
    if (!nextResetDate) return null;
    
    const now = new Date();
    const diffTime = nextResetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error(`Error calculating days until reset for contractor ${contractorId}:`, error);
    return null;
  }
}
