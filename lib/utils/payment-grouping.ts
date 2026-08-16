/**
 * Payment grouping utilities for consolidating move-in payments
 * (first month, last month, security deposit) into a single display item
 */

export const MOVE_IN_PAYMENT_TYPES = [
  'first_month_rent',
  'last_month_rent',
  'security_deposit',
  'pet_deposit_annual',
  'cleaning_fee',
] as const;

export type MoveInPaymentType = typeof MOVE_IN_PAYMENT_TYPES[number];

export interface PaymentWithMetadata {
  id: string;
  amount: number | string;
  status: string;
  dueDate?: Date | string;
  paidAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
  tenantName?: string;
  propertyName?: string;
  unitName?: string;
  paymentMethod?: string | null;
}

export interface GroupedPayment {
  id: string;
  type: 'move_in' | 'regular';
  amount: number;
  status: string;
  dueDate?: Date | string;
  paidAt?: Date | string | null;
  tenantName?: string;
  propertyName?: string;
  unitName?: string;
  paymentMethod?: string | null;
  // For move-in payments, contains the individual payment IDs
  paymentIds: string[];
  // Breakdown of move-in components
  breakdown?: {
    firstMonth?: number;
    lastMonth?: number;
    securityDeposit?: number;
    petDeposit?: number;
    cleaningFee?: number;
  };
  // Original payments for reference
  originalPayments?: PaymentWithMetadata[];
}

/**
 * Check if a payment is a move-in payment type
 */
export function isMoveInPayment(payment: PaymentWithMetadata): boolean {
  const type = (payment.metadata as Record<string, unknown>)?.type as string;
  return MOVE_IN_PAYMENT_TYPES.includes(type as MoveInPaymentType);
}

/**
 * Get the payment type from metadata
 */
export function getPaymentType(payment: PaymentWithMetadata): string {
  return ((payment.metadata as Record<string, unknown>)?.type as string) || 'monthly_rent';
}

/**
 * Get a human-readable label for a payment type
 */
export function getPaymentTypeLabel(type: string): string {
  switch (type) {
    case 'first_month_rent':
      return 'First Month';
    case 'last_month_rent':
      return 'Last Month';
    case 'security_deposit':
      return 'Security Deposit';
    case 'pet_deposit_annual':
      return 'Pet Deposit';
    case 'cleaning_fee':
      return 'Cleaning Fee';
    case 'monthly_rent':
      return 'Monthly Rent';
    case 'move_in':
      return 'Move-in Payment';
    default:
      return 'Payment';
  }
}

/**
 * Determine the consolidated status for a group of payments
 * - If any payment is 'processing', the group is 'processing'
 * - If all payments are 'paid', the group is 'paid'
 * - If any payment is 'failed', the group is 'failed'
 * - Otherwise, use the most common status
 */
export function getConsolidatedStatus(payments: PaymentWithMetadata[]): string {
  if (payments.length === 0) return 'pending';
  
  const statuses = payments.map(p => p.status);
  
  // Priority order for status determination
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('processing')) return 'processing';
  if (statuses.every(s => s === 'paid')) return 'paid';
  if (statuses.includes('overdue')) return 'overdue';
  
  return 'pending';
}

/**
 * Group payments by tenant and consolidate move-in payments
 * Returns an array of grouped payments where move-in payments are combined
 */
export function groupPaymentsByTenant(
  payments: PaymentWithMetadata[]
): Map<string, GroupedPayment[]> {
  const byTenant = new Map<string, PaymentWithMetadata[]>();
  
  // Group by tenant
  for (const payment of payments) {
    const key = payment.tenantName || 'unknown';
    if (!byTenant.has(key)) {
      byTenant.set(key, []);
    }
    byTenant.get(key)!.push(payment);
  }
  
  // Consolidate move-in payments for each tenant
  const result = new Map<string, GroupedPayment[]>();
  
  for (const [tenant, tenantPayments] of byTenant) {
    result.set(tenant, consolidateMoveInPayments(tenantPayments));
  }
  
  return result;
}

/**
 * Consolidate move-in payments into a single grouped payment
 * Regular payments are passed through as-is
 */
export function consolidateMoveInPayments(
  payments: PaymentWithMetadata[]
): GroupedPayment[] {
  const moveInPayments: PaymentWithMetadata[] = [];
  const regularPayments: PaymentWithMetadata[] = [];
  
  // Separate move-in from regular payments
  for (const payment of payments) {
    if (isMoveInPayment(payment)) {
      moveInPayments.push(payment);
    } else {
      regularPayments.push(payment);
    }
  }
  
  const result: GroupedPayment[] = [];
  
  // Group move-in payments by tenant + property + due date
  const moveInGroups = new Map<string, PaymentWithMetadata[]>();
  
  for (const payment of moveInPayments) {
    // Create a key based on tenant, property, and approximate due date
    const dueDate = payment.dueDate 
      ? new Date(payment.dueDate).toISOString().split('T')[0] 
      : 'no-date';
    const key = `${payment.tenantName || 'unknown'}-${payment.propertyName || 'unknown'}-${dueDate}`;
    
    if (!moveInGroups.has(key)) {
      moveInGroups.set(key, []);
    }
    moveInGroups.get(key)!.push(payment);
  }
  
  // Create consolidated move-in payment entries
  for (const [, group] of moveInGroups) {
    if (group.length === 0) continue;
    
    const firstPayment = group[0];
    const totalAmount = group.reduce((sum, p) => sum + Number(p.amount), 0);
    
    // Build breakdown
    const breakdown: GroupedPayment['breakdown'] = {};
    for (const p of group) {
      const type = getPaymentType(p);
      const amount = Number(p.amount);
      switch (type) {
        case 'first_month_rent':
          breakdown.firstMonth = amount;
          break;
        case 'last_month_rent':
          breakdown.lastMonth = amount;
          break;
        case 'security_deposit':
          breakdown.securityDeposit = amount;
          break;
        case 'pet_deposit_annual':
          breakdown.petDeposit = amount;
          break;
        case 'cleaning_fee':
          breakdown.cleaningFee = amount;
          break;
      }
    }
    
    result.push({
      id: `move-in-${group.map(p => p.id).join('-')}`,
      type: 'move_in',
      amount: totalAmount,
      status: getConsolidatedStatus(group),
      dueDate: firstPayment.dueDate,
      paidAt: group.find(p => p.paidAt)?.paidAt || null,
      tenantName: firstPayment.tenantName,
      propertyName: firstPayment.propertyName,
      unitName: firstPayment.unitName,
      paymentMethod: firstPayment.paymentMethod,
      paymentIds: group.map(p => p.id),
      breakdown,
      originalPayments: group,
    });
  }
  
  // Add regular payments as-is
  for (const payment of regularPayments) {
    result.push({
      id: payment.id,
      type: 'regular',
      amount: Number(payment.amount),
      status: payment.status,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
      tenantName: payment.tenantName,
      propertyName: payment.propertyName,
      unitName: payment.unitName,
      paymentMethod: payment.paymentMethod,
      paymentIds: [payment.id],
    });
  }
  
  // Sort by due date (most recent first)
  result.sort((a, b) => {
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return dateB - dateA;
  });
  
  return result;
}

/**
 * Get display-friendly status label
 * Maps internal status to user-friendly labels
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'In Transit';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Failed';
    case 'overdue':
      return 'Overdue';
    case 'partially_paid':
      return 'Partial';
    default:
      return status;
  }
}
