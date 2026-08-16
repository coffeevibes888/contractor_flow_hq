/**
 * Payout Security Configuration
 * 
 * Security thresholds for landlord payouts to prevent fraud
 */

export const PAYOUT_SECURITY = {
  // New payout method cooling-off period (hours)
  NEW_METHOD_COOLOFF_HOURS: 24,
  
  // Large payout threshold requiring extra verification ($)
  LARGE_PAYOUT_THRESHOLD: 5000,
  
  // Max payouts per day
  MAX_PAYOUTS_PER_DAY: 3,
  
  // Max payout amount per day ($)
  MAX_DAILY_PAYOUT_AMOUNT: 25000,
  
  // Suspicious activity: multiple failed attempts
  MAX_FAILED_ATTEMPTS_BEFORE_LOCK: 5,
  
  // Lock duration after suspicious activity (hours)
  SUSPICIOUS_LOCK_HOURS: 24,
} as const;
