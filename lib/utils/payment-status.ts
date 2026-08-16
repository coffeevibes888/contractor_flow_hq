/**
 * Payment status utility functions for ACH and card payments
 */

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'overdue';

export interface PaymentStatusInfo {
  label: string;
  description: string;
  color: 'gray' | 'blue' | 'green' | 'red' | 'amber';
  icon: 'clock' | 'spinner' | 'check' | 'x' | 'alert';
}

export function getPaymentStatusInfo(status: PaymentStatus): PaymentStatusInfo {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        description: 'Payment not yet initiated',
        color: 'gray',
        icon: 'clock',
      };
    case 'processing':
      return {
        label: 'Processing',
        description: 'ACH payment clearing (5-7 business days)',
        color: 'blue',
        icon: 'spinner',
      };
    case 'paid':
      return {
        label: 'Paid',
        description: 'Payment successfully received',
        color: 'green',
        icon: 'check',
      };
    case 'failed':
      return {
        label: 'Failed',
        description: 'Payment failed or was declined',
        color: 'red',
        icon: 'x',
      };
    case 'overdue':
      return {
        label: 'Overdue',
        description: 'Payment is past due date',
        color: 'amber',
        icon: 'alert',
      };
    default:
      return {
        label: 'Unknown',
        description: 'Status unknown',
        color: 'gray',
        icon: 'clock',
      };
  }
}

/**
 * Calculate estimated arrival date for ACH payments
 * @param initiatedDate - When the payment was initiated
 * @returns Estimated arrival date (5-7 business days from initiation)
 */
export function getACHEstimatedArrival(initiatedDate: Date): Date {
  const estimated = new Date(initiatedDate);
  let businessDaysAdded = 0;
  
  // Add 7 business days (skip weekends)
  while (businessDaysAdded < 7) {
    estimated.setDate(estimated.getDate() + 1);
    const dayOfWeek = estimated.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysAdded++;
    }
  }
  
  return estimated;
}

/**
 * Format payment method display name
 */
export function formatPaymentMethod(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) return 'Unknown';
  
  switch (paymentMethod.toLowerCase()) {
    case 'us_bank_account':
    case 'ach':
      return 'Bank Transfer (ACH)';
    case 'card':
      return 'Card Payment';
    case 'cash':
      return 'Cash Payment';
    default:
      return paymentMethod;
  }
}

