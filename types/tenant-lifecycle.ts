// Tenant Lifecycle Management Types

import type { 
  Lease, 
  User, 
  Unit, 
  Property,
  EvictionNotice,
  TenantDeparture,
  DepositDisposition,
  DepositDeductionItem,
  UnitTurnoverChecklist,
  TenantHistory
} from '@prisma/client';

// ============= Enums / Union Types =============

export type NoticeType = '3-day' | '7-day' | '30-day';

export type EvictionNoticeStatus = 
  | 'served' 
  | 'cure_period' 
  | 'cured' 
  | 'expired' 
  | 'filed_with_court' 
  | 'completed';

export type DepartureType = 
  | 'eviction' 
  | 'voluntary' 
  | 'lease_end' 
  | 'mutual_agreement';

export type DeductionCategory = 
  | 'damages' 
  | 'unpaid_rent' 
  | 'cleaning' 
  | 'repairs' 
  | 'other';

export type BalanceDisposition = 
  | 'write_off' 
  | 'apply_deposit' 
  | 'collections';

export type DepositRefundMethod = 
  | 'check' 
  | 'ach' 
  | 'pending';

export type RefundStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed';

// ============= Extended Types with Relations =============

export interface LeaseWithTenant extends Lease {
  tenant: User;
  unit: Unit & { property: Property };
  evictionNotices?: EvictionNotice[];
  departures?: TenantDeparture[];
  depositDispositions?: DepositDisposition[];
}

export interface UnitWithLease extends Unit {
  leases: (Lease & { tenant: User })[];
  property: Property;
}

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  leaseId: string;
  unitId: string;
  unitName: string;
}

// ============= Component Props =============

export interface TenantCardProps {
  lease: LeaseWithTenant;
  isExpanded: boolean;
  onToggle: () => void;
  propertyId: string;
  onViewLease: () => void;
  onRefresh: () => void;
}

export interface TenantActionsMenuProps {
  lease?: LeaseWithTenant;
  propertyId?: string;
  onStartEviction: () => void;
  onRecordDeparture: () => void;
  onTerminateLease: () => void;
  onProcessDeposit: () => void;
  onViewNotices: () => void;
}

export interface EvictionNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lease: LeaseWithTenant;
  propertyId: string;
  onSuccess: () => void;
}

export interface DepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lease: LeaseWithTenant;
  onSuccess: () => void;
}

export interface TerminateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  lease: LeaseWithTenant;
  onSuccess: () => void;
}

export interface DepositDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lease: LeaseWithTenant;
  depositAmount: number;
  outstandingBalance: number;
  onSuccess: () => void;
}

export interface UnitAvailabilityToggleProps {
  unit: UnitWithLease;
  onToggle: (available: boolean) => Promise<void>;
  onTenantDetected: (tenant: TenantInfo) => void;
}

export interface TenantDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantInfo;
  unit: Unit;
  onConfirmDeparture: (departed: boolean) => void;
  onConfirmTermination: (terminate: boolean) => void;
}

export interface EvidenceUploadProps {
  onUpload: (files: UploadedEvidence[]) => void;
  existingFiles: UploadedEvidence[];
  onRemove: (index: number) => void;
}

export interface UploadedEvidence {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  fileName: string;
}

export interface PastTenantsTabProps {
  unitId?: string;
  propertyId?: string;
  landlordId: string;
}

export interface TurnoverChecklistCardProps {
  checklist: UnitTurnoverChecklist;
  onUpdate: (item: ChecklistItem, completed: boolean, notes?: string) => Promise<void>;
  onMarkAvailable: () => Promise<void>;
}

export type ChecklistItem = 
  | 'depositProcessed' 
  | 'keysCollected' 
  | 'unitInspected' 
  | 'cleaningCompleted' 
  | 'repairsCompleted';

// ============= Form Data Types =============

export interface EvictionNoticeFormData {
  noticeType: NoticeType;
  reason: string;
  amountOwed?: number;
  additionalNotes?: string;
}

export interface DepartureFormData {
  departureDate: string;
  notes?: string;
}

export interface TerminateLeaseFormData {
  reason: DepartureType;
  terminationDate: string;
  notes?: string;
  initiateOffboarding: boolean;
}

export interface DeductionItemFormData {
  id: string;
  category: DeductionCategory;
  amount: number;
  description: string;
  evidenceUrls: string[];
}

export interface DepositDispositionFormData {
  originalAmount: number;
  deductions: DeductionItemFormData[];
  refundAmount: number;
  refundMethod: DepositRefundMethod;
  notes?: string;
}

// ============= API Request Types =============

export interface CreateEvictionNoticeRequest {
  leaseId: string;
  noticeType: NoticeType;
  reason: string;
  amountOwed?: number;
  additionalNotes?: string;
}

export interface UpdateEvictionStatusRequest {
  status: EvictionNoticeStatus;
  notes?: string;
}

export interface RecordDepartureRequest {
  leaseId: string;
  departureType: DepartureType;
  departureDate: string;
  notes?: string;
  evictionNoticeId?: string;
}

export interface TerminateLeaseRequest {
  reason: DepartureType;
  terminationDate: string;
  notes?: string;
  initiateOffboarding: boolean;
}

export interface CreateDepositDispositionRequest {
  leaseId: string;
  originalAmount: number;
  deductions: {
    category: DeductionCategory;
    amount: number;
    description: string;
    evidenceUrls: string[];
  }[];
  refundMethod: DepositRefundMethod;
  notes?: string;
}

export interface UpdateAvailabilityRequest {
  isAvailable: boolean;
  forceTermination?: boolean;
}

export interface CreateTurnoverChecklistRequest {
  leaseId?: string;
}

export interface UpdateChecklistItemRequest {
  item: ChecklistItem;
  completed: boolean;
  notes?: string;
}

export interface TenantHistoryQuery {
  page?: number;
  limit?: number;
  departureType?: DepartureType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============= API Response Types =============

export interface CreateEvictionNoticeResponse {
  success: boolean;
  evictionNotice: EvictionNotice;
  deadlineDate: string;
}

export interface RecordDepartureResponse {
  success: boolean;
  departure: TenantDeparture;
  offboardingInitiated: boolean;
}

export interface TerminateLeaseResponse {
  success: boolean;
  lease: Lease;
  offboardingId?: string;
}

export interface UpdateAvailabilityResponse {
  success: boolean;
  unit: Unit;
  tenantDetected?: TenantInfo;
  requiresConfirmation: boolean;
}

export interface UploadEvidenceResponse {
  success: boolean;
  url: string;
  publicId: string;
}

export interface TenantHistoryResponse {
  success: boolean;
  history: TenantHistory[];
  total: number;
  page: number;
  limit: number;
}

// ============= Service Types =============

export interface OffboardingParams {
  leaseId: string;
  departureType: DepartureType;
  departureDate: Date;
  notes?: string;
  markUnitAvailable?: boolean;
}

export interface OffboardingResult {
  success: boolean;
  leaseTerminated: boolean;
  departureRecorded: boolean;
  depositDispositionId?: string;
  tenantHistoryId?: string;
  turnoverChecklistId?: string;
  errors?: string[];
}

export interface OutstandingBalanceParams {
  leaseId: string;
  disposition: BalanceDisposition;
  depositToApply?: number;
}

// ============= Utility Types =============

export const NOTICE_DAYS: Record<NoticeType, number> = {
  '3-day': 3,
  '7-day': 7,
  '30-day': 30,
};

export const EVICTION_STATUS_FLOW: Record<EvictionNoticeStatus, EvictionNoticeStatus[]> = {
  'served': ['cure_period', 'cured', 'expired'],
  'cure_period': ['cured', 'expired'],
  'cured': [],
  'expired': ['filed_with_court'],
  'filed_with_court': ['completed'],
  'completed': [],
};

export function isValidStatusTransition(
  currentStatus: EvictionNoticeStatus, 
  newStatus: EvictionNoticeStatus
): boolean {
  return EVICTION_STATUS_FLOW[currentStatus]?.includes(newStatus) ?? false;
}

export function calculateDeadlineDate(serveDate: Date, noticeType: NoticeType): Date {
  const deadline = new Date(serveDate);
  deadline.setDate(deadline.getDate() + NOTICE_DAYS[noticeType]);
  return deadline;
}
