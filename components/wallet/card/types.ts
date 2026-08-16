/**
 * Wire shapes for the Issuing card UI. Shared between the request flow,
 * the card display, and the spend-controls drawer.
 */
export interface IssuingCardSummary {
  id: string;
  type: 'virtual' | 'physical';
  status: string;
  frozen: boolean;
  last4: string | null;
  brand: string | null;
  expMonth: number | null;
  expYear: number | null;
  monthlyLimitCents: number | null;
  blockedCategories: string[];
  shippingStatus: string | null;
  shippingTrackingNumber: string | null;
  shippingCarrier: string | null;
  createdAt: string;
}

export interface IssuingActivityRow {
  id: string;
  amount: number;
  approved?: boolean;
  type?: string;
  merchantName: string | null;
  merchantCategory: string | null;
  merchantCity?: string | null;
  merchantState?: string | null;
  declineReason?: string | null;
  createdAt: string;
}
