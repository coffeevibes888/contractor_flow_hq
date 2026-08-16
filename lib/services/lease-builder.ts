/**
 * Comprehensive Lease Builder Service
 * Generates court-ready residential lease agreements with all required legal sections
 * Auto-populates from property, unit, landlord, and tenant data
 */

export interface LeaseBuilderData {
  // Parties
  landlordLegalName: string;
  landlordCompanyName?: string;
  landlordAddress?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  tenantNames: string[]; // All adult tenants
  tenantEmails: string[];
  
  // Property
  propertyAddress: string;
  unitNumber?: string;
  propertyDescription?: string;
  includedAreas?: string[]; // garage, yard, storage, parking space #
  maxOccupants?: number;
  
  // Lease Term
  leaseStartDate: Date;
  leaseEndDate?: Date; // null = month-to-month
  isMonthToMonth: boolean;
  autoRenewal: boolean;
  renewalNoticeDays: number; // typically 30 or 60
  earlyTerminationFee?: number;
  earlyTerminationNoticeDays?: number;
  
  // Rent & Payment
  monthlyRent: number;
  rentDueDay: number; // 1-28
  gracePeriodDays: number; // typically 3-5
  acceptedPaymentMethods: string[];
  paymentInstructions?: string;
  bouncedCheckFee?: number;
  allowPartialPayments: boolean;

  // Late Fees
  lateFeeAmount?: number;
  lateFeePercent?: number; // alternative to flat amount
  lateFeeStartDay: number; // day after due date when late fee applies
  maxLateFee?: number; // cap per state law
  
  // Security Deposit
  securityDepositAmount: number;
  depositUseCases: string[]; // unpaid rent, damages, cleaning, etc.
  depositReturnDays: number; // typically 14-30 days per state
  depositNotLastMonthRent: boolean;
  
  // Utilities
  tenantPaysUtilities: string[];
  landlordPaysUtilities: string[];
  sharedUtilitiesNote?: string;
  
  // Pet Policy
  petsAllowed: boolean;
  petRestrictions?: string; // breed, size, type limits
  petDeposit?: number;
  petRent?: number;
  petRules?: string;
  
  // Property Rules
  smokingAllowed: boolean;
  smokingAreas?: string;
  quietHoursStart?: string; // "10:00 PM"
  quietHoursEnd?: string; // "8:00 AM"
  parkingRules?: string;
  guestPolicy?: string;
  
  // Maintenance
  tenantMaintenanceResponsibilities?: string[];
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  
  // Entry & Access
  entryNoticeDays: number; // typically 24-48 hours
  entryReasons?: string[];
  
  // Insurance
  rentersInsuranceRequired: boolean;
  minInsuranceCoverage?: number;
  
  // Move-out
  moveOutNoticeDays: number; // typically 30 or 60
  moveOutCleaningRequirements?: string[];
  
  // Additional Terms
  additionalTerms?: string[];
  hoaRules?: string;
  
  // Disclosures
  leadPaintDisclosure?: boolean; // required for pre-1978 buildings
  bedBugDisclosure?: boolean;
  moldDisclosure?: boolean;
  radonDisclosure?: boolean;
  floodZoneDisclosure?: boolean;
  asbestosDisclosure?: boolean;
  
  // State-specific
  state: string; // for state-specific legal requirements
  
  // Signing date
  signingDate: Date;
}

// Audit trail for legal documentation
export interface LeaseAuditTrail {
  leaseId: string;
  createdAt: Date;
  createdBy: string; // landlord user ID
  propertyId: string;
  unitId: string;
  tenantId?: string;
  version: number;
  events: LeaseAuditEvent[];
}

export interface LeaseAuditEvent {
  timestamp: Date;
  eventType: 'created' | 'modified' | 'sent_for_signature' | 'viewed' | 'signed' | 'countersigned' | 'executed' | 'notice_sent';
  actor: string; // user ID or 'system'
  actorRole: 'landlord' | 'tenant' | 'system';
  actorName?: string;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  documentHash?: string; // SHA-256 hash of document at this point
}

// ─── State-specific disclosure and legal requirements ────────────────────────
// tier: 1 = full coverage, 2 = good + warnings, 3 = framework + strong warning
// evictionNoticeDays: "Pay or Quit" statutory notice period
// maxLateFeePct / maxLateFeeDollar: state caps (use whichever is lower when both set)
// depositInterestRequired: landlord must hold deposit in interest-bearing account
// moveInChecklistRequired: statute requires written move-in checklist
// justCauseEviction: state/local law requires a reason to terminate tenancy
// relocationAssistanceDays: months rent landlord must pay for no-fault termination (OR=1)

export interface StateDisclosure {
  leadPaint: boolean;
  mold: boolean;
  bedBugs: boolean;
  radon: boolean;
  asbestos: boolean;
  floodZone: boolean;
  sexOffender: boolean;
  smokingPolicy: boolean;
  securityDepositLimit?: number;   // multiplier of monthly rent
  depositReturnDays: number;
  maxLateFeePct?: number;          // % of monthly rent
  maxLateFeeDollar?: number;       // flat dollar cap
  evictionNoticeDays: number;      // "Pay or Quit" days
  depositInterestRequired: boolean;
  moveInChecklistRequired: boolean;
  justCauseEviction: boolean;
  relocationAssistanceMonths?: number;
  tier: 1 | 2 | 3;
  warningText?: string;            // shown in UI when state is selected
  notes?: string[];
}

export const STATE_DISCLOSURES: Record<string, StateDisclosure> = {
  // ── Tier 3: High-complexity — needs attorney review / official forms ─────
  NY: {
    leadPaint: true, mold: true, bedBugs: true, radon: false, asbestos: true,
    floodZone: true, sexOffender: false, smokingPolicy: true,
    securityDepositLimit: 1,       // HSTPA 2019: 1 month maximum
    depositReturnDays: 14,
    maxLateFeePct: 5, maxLateFeeDollar: 50,  // lesser of the two
    evictionNoticeDays: 14,        // NY requires 14-day notice for nonpayment
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: true,       // HSTPA — Good Cause Eviction expanding
    tier: 3,
    warningText: 'New York has some of the most complex landlord-tenant laws in the US. Rent-stabilized units MUST use DHCR Form RTP-8 — this builder cannot be used for stabilized units. Free-market units still require specific NYC disclosures (bedbug history, window guard notice). The 1-month security deposit cap is absolute. We strongly recommend attorney review before using this lease in New York.',
    notes: ['NYC: bedbug disclosure must cover unit AND building history for prior year', 'NYC: window guard notice required if children under 10 occupy', 'NY Real Property Law §234: attorney\'s fees clause is automatically reciprocal'],
  },
  NJ: {
    leadPaint: true, mold: true, bedBugs: true, radon: true, asbestos: false,
    floodZone: true, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 1.5,     // 1.5 months max
    depositReturnDays: 30,
    evictionNoticeDays: 3,         // 3 business days (not calendar)
    depositInterestRequired: true, // must hold in NJ bank, pay annual interest
    moveInChecklistRequired: false,
    justCauseEviction: true,       // Anti-Eviction Act — very strong
    tier: 3,
    warningText: 'New Jersey requires landlords to provide tenants with the official "Truth in Renting" brochure (mandatory by law). Security deposits must be held in an interest-bearing NJ bank account and annual interest must be paid to the tenant. The Anti-Eviction Act requires "good cause" to terminate most tenancies — a lease expiration alone is NOT sufficient grounds to evict in NJ. Attorney review is strongly recommended.',
    notes: ['Must provide NJ "Truth in Renting" brochure at lease signing', 'Deposit must earn interest — notify tenant of bank & account within 30 days', 'Good cause required for eviction after any tenancy'],
  },

  // ── Tier 2: Complex — good coverage with important warnings ──────────────
  CA: {
    leadPaint: true, mold: true, bedBugs: true, radon: false, asbestos: true,
    floodZone: true, sexOffender: true, smokingPolicy: true,
    securityDepositLimit: 1,       // SB 567 (2024): 1 month for most landlords
    depositReturnDays: 21,
    maxLateFeePct: 6,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: true,       // AB 1482 — buildings 15+ years old
    tier: 2,
    warningText: 'California: SB 567 (effective July 2024) reduced the security deposit limit to 1 month\'s rent for landlords with 2+ units. AB 1482 requires "just cause" to terminate tenancies in most buildings 15+ years old. Pre-move-out inspection is required by Civil Code §1950.5. Required disclosures include: Megan\'s Law, military ordnance, DEA property history, flooding, and more. Local rent control may apply in LA, San Francisco, Oakland, and many other cities.',
    notes: ['CA Civil Code §1950.5: pre-move-out inspection REQUIRED — must offer within 2 weeks of move-out', 'Receipt required for any repair deduction over $125', 'AB 1482 just-cause: applies to most units built before 2009'],
  },
  WA: {
    leadPaint: true, mold: true, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: true, smokingPolicy: true,
    depositReturnDays: 21,
    evictionNoticeDays: 14,        // RCW 59.18: 14-day pay-or-vacate
    depositInterestRequired: false,
    moveInChecklistRequired: true, // RCW 59.18.260: written checklist required within 72 hrs
    justCauseEviction: false,      // statewide no (Seattle has local just-cause)
    tier: 2,
    warningText: 'Washington State requires a written move-in checklist provided to the tenant within 72 hours of move-in (RCW 59.18.260). Without this, the landlord cannot make deductions for pre-existing conditions. The statutory eviction notice is 14 days (pay or vacate), not 3-5. Seattle has local just-cause eviction protections. Smoke/CO detector maintenance responsibilities are split by statute.',
    notes: ['Move-in checklist required within 72 hours — without it you cannot deduct for pre-existing damage', 'Seattle: just cause eviction required — check if your property is in Seattle city limits'],
  },
  OR: {
    leadPaint: true, mold: true, bedBugs: false, radon: false, asbestos: false,
    floodZone: true, sexOffender: false, smokingPolicy: true,
    depositReturnDays: 31,
    maxLateFeePct: 5,
    evictionNoticeDays: 10,        // ORS 90.394: 10-day notice
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: true,       // SB 608 (2019): statewide just-cause after 1 year
    relocationAssistanceMonths: 1, // 1 month rent for no-fault termination
    tier: 2,
    warningText: 'Oregon SB 608 (2019): after 1 year of tenancy, landlord MUST have "just cause" to terminate. No-fault terminations require 90 days written notice AND 1 month\'s rent in relocation assistance. Rent increases require 90 days notice (not 30). Late fees are capped at 5% after a 4-day grace period. Deposit must be returned with itemized statement within 31 days even if there are no deductions.',
    notes: ['90-day notice required for rent increases and no-fault terminations after 1 year', '1 month relocation assistance required for no-fault termination after 1 year', 'Itemized deposit statement required even if no deductions are made'],
  },
  IL: {
    leadPaint: true, mold: false, bedBugs: true, radon: true, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 5,
    depositInterestRequired: false, // Chicago: YES; rest of IL: no
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 2,
    warningText: 'Chicago has one of the most tenant-protective local ordinances in the US (RLTO). Chicago landlords MUST hold security deposits in interest-bearing accounts and pay the city-set interest rate annually — failure results in 2× damages payable to the tenant. Chicago also requires specific lease rider language. If your property is in Chicago, the Chicago RLTO applies in addition to state law.',
    notes: ['Chicago RLTO: deposit must earn interest at city-set rate — non-compliance = 2× damages', 'Chicago: specific RLTO rider may be required', 'Check if your city (Evanston, Urbana, etc.) has local RLTO-style ordinances'],
  },
  MA: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 1,       // 1 month maximum
    depositReturnDays: 30,
    evictionNoticeDays: 14,
    depositInterestRequired: true, // deposit AND last month's rent must earn interest
    moveInChecklistRequired: true, // statement of condition required
    justCauseEviction: false,
    tier: 2,
    warningText: 'Massachusetts: security deposit is capped at 1 month\'s rent. Landlords collecting last month\'s rent must also pay interest on it (5% or the bank rate, whichever is lower). A "Statement of Condition" (written checklist) is required at move-in. No late fees may be charged until rent is 30 days overdue. Receipts required for all cash payments.',
    notes: ['Cannot charge late fee until rent is 30 days past due', 'Written receipt required for all cash and check payments', 'Statement of condition required at move-in or tenant not responsible for pre-existing damage'],
  },
  MN: {
    leadPaint: true, mold: false, bedBugs: true, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 21,
    evictionNoticeDays: 14,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: true,       // 2024: Minnesota enacted just-cause statewide
    tier: 2,
    warningText: 'Minnesota enacted statewide just-cause eviction protection in 2024. Landlords must have a qualifying reason to non-renew or terminate a tenancy. Allowed reasons include nonpayment, lease violations, and certain no-fault reasons — but simply wanting a tenant to leave is no longer sufficient. This is a recent change that significantly affects lease termination.',
    notes: ['2024: Just-cause eviction protection enacted statewide — review current MN Statutes §504B'],
  },

  // ── Tier 1: Full coverage — well-handled by the template ─────────────────
  NV: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 3,
    depositReturnDays: 30,
    maxLateFeePct: 5, maxLateFeeDollar: 75,
    evictionNoticeDays: 7,         // NRS 118A: 7-day pay or quit
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['Nevada is landlord-friendly with no statewide rent control', 'Late fee cap: 5% of monthly rent OR $75, whichever is LESS'],
  },
  TX: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: true, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['TX Property Code §92.056: landlord must repair health/safety conditions within reasonable time after notice', 'No statewide rent control in Texas'],
  },
  FL: {
    leadPaint: true, mold: false, bedBugs: false, radon: true, asbestos: false,
    floodZone: true, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 15,
    maxLateFeePct: 5,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['FL Stat. 83.49: if deposit held in interest-bearing account, must notify tenant within 30 days', 'FL has no statewide rent control (preempted by state law)'],
  },
  AZ: {
    leadPaint: true, mold: false, bedBugs: true, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 1.5,
    depositReturnDays: 14,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: true, // ARS §33-1321: move-in checklist required
    justCauseEviction: false,
    tier: 1,
    notes: ['ARS §33-1321: written move-in checklist required — tenant has 5 business days to note damage', 'Must notify tenant of deposit location within 14 days of move-in'],
  },
  CO: {
    leadPaint: true, mold: false, bedBugs: false, radon: true, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 2,
    depositReturnDays: 30,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['SB 23-184 (2023): landlord has statutory duty to mitigate damages upon tenant breach', 'Denver and some other cities have local tenant protections'],
  },
  GA: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  NC: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 2,       // 2× for month-to-month; 2× fixed-term <2mo
    depositReturnDays: 30,
    evictionNoticeDays: 10,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['Late fee: greater of $15 or 5% of monthly rent', 'Deposit must be in trust account at NC bank'],
  },
  VA: {
    leadPaint: true, mold: true, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 2,
    depositReturnDays: 45,
    maxLateFeePct: 10,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: true, // VRLTA: landlord must provide itemized deduction list at move-in
    justCauseEviction: false,
    tier: 1,
    notes: ['VRLTA: itemized list of potential deductions must be given AT move-in', 'Tenant must provide 30-day written notice to terminate month-to-month'],
  },
  PA: {
    leadPaint: true, mold: false, bedBugs: false, radon: true, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 2,       // 2× first year; 1× thereafter
    depositReturnDays: 30,
    evictionNoticeDays: 10,
    depositInterestRequired: true, // if >100 units; escrow required for all
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['Deposit: 2× first year, reduced to 1× month after that — excess must be returned', 'Deposit must be held in escrow account; notify tenant of account within 30 days'],
  },
  OH: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: undefined,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['ORC 5321: must provide written receipts for cash payments', 'Deposit held >30 days must earn 5% annual interest if over $50'],
  },
  MI: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 1.5,
    depositReturnDays: 30,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: true, // must provide within 7 days or lose right to deduct
    justCauseEviction: false,
    tier: 1,
    notes: ['Move-in checklist required within 7 days of occupancy — failure forfeits right to collect deposit', 'Deposit must be held in financial institution; notify tenant within 14 days'],
  },
  TN: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 14,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  SC: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  AL: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 35,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  MS: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 45,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  LA: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: true, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  AR: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  MO: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  KS: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  OK: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 45,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  IA: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  NE: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 14,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  SD: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 14,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  ND: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  MN_: { // aliased below
    leadPaint: true, mold: false, bedBugs: true, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 21,
    evictionNoticeDays: 14,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: true,
    tier: 2,
  },
  WI: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 21,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: true,
    justCauseEviction: false,
    tier: 1,
    notes: ['WI Stat. 704.095: written move-in checklist required'],
  },
  IN: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 45,
    evictionNoticeDays: 10,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  KY: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: true,
    justCauseEviction: false,
    tier: 1,
  },
  WV: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 60,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  MD: {
    leadPaint: true, mold: true, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 2,
    depositReturnDays: 45,
    maxLateFeePct: 5,
    evictionNoticeDays: 4,
    depositInterestRequired: true, // must pay 1.5% or 3% interest depending on amount
    moveInChecklistRequired: true,
    justCauseEviction: false,
    tier: 1,
    notes: ['MD: lead paint disclosure is extremely strict — MDE form required for pre-1978 buildings', 'Montgomery County and Prince George\'s County have additional local protections'],
  },
  DE: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 20,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  CT: {
    leadPaint: true, mold: false, bedBugs: true, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 2,       // 1× for tenants 62+
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: true, // must pay annual interest at savings rate
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
    notes: ['CT: tenants age 62+ have 1-month deposit cap; all others 2-month', 'Annual interest must be paid on security deposit'],
  },
  RI: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 1,       // 1 month maximum
    depositReturnDays: 20,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  VT: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 14,
    evictionNoticeDays: 14,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  NH: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: true,
    justCauseEviction: false,
    tier: 1,
  },
  ME: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 21,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  ID: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 21,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  MT: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 10,         // 10 business days with no deductions; 30 days with itemized list
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  WY: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  UT: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  NM: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 3,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
  HI: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: true, sexOffender: false, smokingPolicy: false,
    securityDepositLimit: 1,       // 1 month maximum
    depositReturnDays: 14,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: true,
    justCauseEviction: false,
    tier: 1,
    notes: ['Hawaii has very strict habitability requirements — warranty of habitability strictly enforced'],
  },
  AK: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 14,
    evictionNoticeDays: 7,
    depositInterestRequired: false,
    moveInChecklistRequired: true,
    justCauseEviction: false,
    tier: 1,
  },

  // Default for any state not explicitly listed
  DEFAULT: {
    leadPaint: true, mold: false, bedBugs: false, radon: false, asbestos: false,
    floodZone: false, sexOffender: false, smokingPolicy: false,
    depositReturnDays: 30,
    evictionNoticeDays: 5,
    depositInterestRequired: false,
    moveInChecklistRequired: false,
    justCauseEviction: false,
    tier: 1,
  },
};

// Fix MN alias (TypeScript won't let us have duplicate keys)
(STATE_DISCLOSURES as any).MN = {
  leadPaint: true, mold: false, bedBugs: true, radon: false, asbestos: false,
  floodZone: false, sexOffender: false, smokingPolicy: false,
  depositReturnDays: 21, evictionNoticeDays: 14,
  depositInterestRequired: false, moveInChecklistRequired: false,
  justCauseEviction: true, tier: 2,
  warningText: 'Minnesota enacted statewide just-cause eviction protection in 2024. Landlords must have a qualifying reason to non-renew or terminate a tenancy. Review current MN Statutes §504B for allowed grounds.',
  notes: ['2024: Just-cause eviction protection enacted statewide'],
};
delete (STATE_DISCLOSURES as any).MN_;

export function getStateDisclosures(state: string): StateDisclosure {
  return (STATE_DISCLOSURES[state.toUpperCase()] || STATE_DISCLOSURES.DEFAULT) as StateDisclosure;
}

// Legal disclaimer that must appear on all generated leases
export const LEGAL_DISCLAIMER = `
IMPORTANT LEGAL NOTICE

This lease agreement was generated using PropertyFlow HQ's Lease Builder tool. By using this document, you acknowledge and agree to the following:

1. NOT LEGAL ADVICE: PropertyFlow HQ is a property management software platform, NOT a law firm. This document is provided as a tool to assist landlords and does not constitute legal advice.

2. NO ATTORNEY-CLIENT RELATIONSHIP: Use of this lease builder does not create an attorney-client relationship between you and PropertyFlow HQ or any of its affiliates.

3. LANDLORD RESPONSIBILITY: The landlord is solely responsible for ensuring this lease complies with all applicable federal, state, and local laws, including but not limited to fair housing laws, landlord-tenant regulations, and disclosure requirements.

4. REVIEW RECOMMENDED: We strongly recommend having this lease reviewed by a licensed attorney in your jurisdiction before use, especially for properties in states with complex landlord-tenant laws (such as California, New York, or New Jersey).

5. STATE-SPECIFIC REQUIREMENTS: While this lease builder attempts to include state-aware provisions, laws vary significantly by state and locality. Some jurisdictions may require additional disclosures, addenda, or specific language not included in this template.

6. NO WARRANTY: This document is provided "as is" without warranty of any kind. PropertyFlow HQ makes no guarantees regarding the enforceability of any provision in this lease.

7. UPDATES: Landlord-tenant laws change frequently. This template may not reflect the most recent legal requirements in your area.

By proceeding with this lease, you confirm that you have read, understood, and agree to these terms.
`;

// Default values for common fields
export const LEASE_DEFAULTS = {
  gracePeriodDays: 5,
  lateFeeStartDay: 6,
  depositReturnDays: 30,
  entryNoticeDays: 24,
  moveOutNoticeDays: 30,
  renewalNoticeDays: 30,
  acceptedPaymentMethods: ['Online Payment Portal', 'Check', 'Money Order'],
  tenantPaysUtilities: ['Electric', 'Gas', 'Internet', 'Cable'],
  landlordPaysUtilities: ['Water', 'Sewer', 'Trash'],
  depositUseCases: [
    'Unpaid rent or late fees',
    'Repair of damages beyond normal wear and tear',
    'Cleaning costs to restore premises to move-in condition',
    'Replacement of unreturned keys or access devices',
    'Any other amounts owed under this lease',
  ],
  tenantMaintenanceResponsibilities: [
    'Keep premises clean and sanitary',
    'Dispose of garbage properly',
    'Replace light bulbs and batteries',
    'Report maintenance issues promptly',
    'Prevent mold growth through proper ventilation',
  ],
  entryReasons: [
    'Repairs and maintenance',
    'Inspections',
    'Showing to prospective tenants or buyers',
    'Emergency situations',
  ],
  moveOutCleaningRequirements: [
    'All rooms swept and mopped/vacuumed',
    'Kitchen appliances cleaned inside and out',
    'Bathrooms cleaned and sanitized',
    'All personal belongings removed',
    'All trash removed from premises',
    'Walls free of holes and marks',
    'Windows cleaned',
  ],
};

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Get ordinal suffix for day of month
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Generate the comprehensive lease HTML document
 * Court-ready residential lease with precise legal terminology
 */
export function generateLeaseHtml(data: LeaseBuilderData): string {
  const leaseEndText = data.isMonthToMonth 
    ? 'Month-to-Month (continuing until terminated by either party with proper notice as set forth herein)'
    : formatDate(data.leaseEndDate!);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Residential Lease Agreement</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      font-size: 11pt; 
      line-height: 1.6; 
      color: #000; 
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }
    h1 { 
      text-align: center; 
      font-size: 16pt; 
      margin-bottom: 24pt;
      text-transform: uppercase;
      font-weight: bold;
      border-bottom: 2px solid #000;
      padding-bottom: 12pt;
    }
    h2 { 
      font-size: 12pt; 
      margin-top: 18pt; 
      margin-bottom: 8pt;
      text-transform: uppercase;
      font-weight: bold;
      border-bottom: 1px solid #333;
      padding-bottom: 4pt;
    }
    h3 {
      font-size: 11pt;
      margin-top: 12pt;
      margin-bottom: 6pt;
      font-weight: bold;
    }
    .section { margin-bottom: 12pt; }
    .field { font-weight: bold; text-decoration: underline; }
    .checkbox { 
      display: inline-block; 
      width: 12px; 
      height: 12px; 
      border: 1px solid #000; 
      margin-right: 6px; 
      vertical-align: middle;
      text-align: center;
      line-height: 10px;
      font-size: 10px;
    }
    .checkbox.checked::after { content: '✓'; }
    .list { margin-left: 20pt; margin-top: 6pt; }
    .list li { margin-bottom: 4pt; }
    .signature-section { 
      margin-top: 36pt; 
      page-break-inside: avoid; 
    }
    .signature-block { 
      display: inline-block; 
      min-width: 250px; 
      border-bottom: 1px solid #000; 
      min-height: 40px;
      margin-bottom: 4pt;
    }
    .sig-row { 
      margin-top: 24pt; 
      display: flex; 
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
    }
    .sig-group { flex: 1; min-width: 280px; }
    .sig-label { font-weight: bold; margin-bottom: 4pt; }
    .date-line { 
      border-bottom: 1px solid #000; 
      width: 150px; 
      display: inline-block; 
    }
    .initials-line {
      border-bottom: 1px solid #000;
      width: 60px;
      display: inline-block;
      text-align: center;
    }
    .initials-row {
      margin-top: 8pt;
      font-size: 10pt;
      color: #333;
    }
    .page-break { page-break-before: always; }
    .legal-notice {
      background: #f5f5f5;
      border: 1px solid #ccc;
      padding: 12pt;
      margin: 12pt 0;
      font-size: 10pt;
    }
    table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
    td, th { border: 1px solid #000; padding: 6pt; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .subsection { margin-left: 12pt; margin-top: 8pt; }
    .legal-term { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Residential Lease Agreement</h1>

  <div class="section">
    <p>THIS RESIDENTIAL LEASE AGREEMENT (hereinafter referred to as "Agreement," "Lease," or "Lease Agreement") 
    is made and entered into as of <span class="field">${formatDate(data.signingDate)}</span> (the "Effective Date"), 
    by and between the following parties, who agree to be legally bound hereby:</p>
  </div>
  
  <!-- RECITALS -->
  <div class="section">
    <p><strong>RECITALS</strong></p>
    <p>WHEREAS, Landlord is the owner or authorized agent of the real property described herein; and</p>
    <p>WHEREAS, Tenant desires to lease the Premises from Landlord for residential purposes only; and</p>
    <p>WHEREAS, the parties desire to set forth their respective rights and obligations with respect to the Premises;</p>
    <p>NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, and for other good 
    and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:</p>
  </div>

  <!-- SECTION 1: PARTIES & PROPERTY -->
  <h2>Article 1. Parties, Premises, and Definitions</h2>
  <div class="section">
    <h3>1.1 Landlord</h3>
    <p><span class="legal-term">"Landlord"</span> refers to the following party, including their heirs, successors, assigns, and authorized agents:</p>
    <p>Legal Name: <span class="field">${data.landlordLegalName}</span></p>
    ${data.landlordCompanyName ? `<p>Business Entity: <span class="field">${data.landlordCompanyName}</span></p>` : ''}
    ${data.landlordAddress ? `<p>Principal Address: <span class="field">${data.landlordAddress}</span></p>` : ''}
    ${data.landlordEmail ? `<p>Email for Notices: <span class="field">${data.landlordEmail}</span></p>` : ''}
    ${data.landlordPhone ? `<p>Telephone: <span class="field">${data.landlordPhone}</span></p>` : ''}
    
    <h3>1.2 Tenant</h3>
    <p><span class="legal-term">"Tenant"</span> refers to the following individual(s), jointly and severally, including their heirs and legal representatives:</p>
    ${data.tenantNames.map((name, i) => `
      <p>Name: <span class="field">${name}</span>${data.tenantEmails[i] ? ` | Email for Notices: <span class="field">${data.tenantEmails[i]}</span>` : ''}</p>
    `).join('')}
    <p><em>All persons listed as Tenant are jointly and severally liable for all obligations under this Lease. This means each Tenant 
    is individually responsible for the full performance of all Lease terms, including the full amount of rent due.</em></p>
    
    <h3>1.3 Premises</h3>
    <p><span class="legal-term">"Premises"</span> refers to the following real property leased to Tenant for residential use only:</p>
    <p>Street Address: <span class="field">${data.propertyAddress}</span></p>
    ${data.unitNumber ? `<p>Unit/Apartment Number: <span class="field">${data.unitNumber}</span></p>` : ''}
    ${data.propertyDescription ? `<p>Property Description: ${data.propertyDescription}</p>` : ''}
    
    ${data.includedAreas && data.includedAreas.length > 0 ? `
    <h3>1.4 Included Areas and Appurtenances</h3>
    <p>The following areas are included as part of the Premises: ${data.includedAreas.join(', ')}</p>
    <p>All other common areas, if any, are for shared use and remain under Landlord's control.</p>
    ` : ''}
    
    <h3>1.5 Authorized Occupants</h3>
    <p>The Premises shall be occupied <strong>solely and exclusively</strong> by the Tenant(s) named above and the following 
    authorized occupants (minor children):</p>
    <p>_____________________________________________________________________________</p>
    ${data.maxOccupants ? `<p><strong>Maximum Occupancy:</strong> <span class="field">${data.maxOccupants}</span> persons, in compliance with applicable housing codes.</p>` : ''}
    <p>No other persons may reside at the Premises for more than fourteen (14) consecutive days or more than thirty (30) days 
    in any twelve-month period without Landlord's prior written consent. Unauthorized occupants constitute a material breach of this Lease.</p>
    
    <h3>1.6 Definitions</h3>
    <p>For purposes of this Agreement:</p>
    <ul class="list">
      <li><span class="legal-term">"Rent"</span> means the monthly rental amount plus any additional charges due under this Lease.</li>
      <li><span class="legal-term">"Security Deposit"</span> means the deposit held by Landlord as security for Tenant's performance.</li>
      <li><span class="legal-term">"Normal Wear and Tear"</span> means deterioration that occurs from ordinary use without negligence, carelessness, accident, or abuse.</li>
      <li><span class="legal-term">"Material Breach"</span> means a violation of this Lease that substantially impairs Landlord's rights or the value of the Premises.</li>
      <li><span class="legal-term">"Business Day"</span> means Monday through Friday, excluding federal and state holidays.</li>
    </ul>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 2: LEASE TERM -->
  <h2>Article 2. Term of Lease</h2>
  <div class="section">
    <h3>2.1 Lease Term</h3>
    <p><strong>Commencement Date:</strong> <span class="field">${formatDate(data.leaseStartDate)}</span></p>
    <p><strong>Expiration Date:</strong> <span class="field">${leaseEndText}</span></p>
    
    <h3>2.2 Type of Tenancy</h3>
    ${data.isMonthToMonth ? `
    <p>This Lease creates a <strong>month-to-month periodic tenancy</strong>. The tenancy shall continue from month to month 
    until terminated by either party upon not less than <span class="field">${data.moveOutNoticeDays}</span> days' prior written 
    notice delivered before the end of any monthly rental period. Notice shall be effective on the last day of the rental period 
    following the notice period.</p>
    ` : `
    <p>This Lease creates a <strong>fixed-term tenancy</strong> for the period specified above. Upon expiration of the initial term:</p>
    ${data.autoRenewal 
      ? `<p><span class="checkbox checked"></span> <strong>Automatic Renewal:</strong> This Lease shall automatically convert to a 
         month-to-month tenancy upon the same terms and conditions, unless either party provides written notice of intent to 
         terminate or modify at least <span class="field">${data.renewalNoticeDays}</span> days prior to the expiration date or 
         any subsequent monthly period.</p>`
      : `<p><span class="checkbox"></span> <strong>No Automatic Renewal:</strong> This Lease shall terminate on the expiration date. 
         Tenant must vacate the Premises unless a new lease agreement is executed. Continued occupancy without a new agreement 
         constitutes a holdover tenancy subject to Section 2.5.</p>`
    }
    `}
    
    <h3>2.3 Early Termination</h3>
    ${data.earlyTerminationFee ? `
    <p>Tenant may request early termination of this Lease subject to ALL of the following conditions:</p>
    <ul class="list">
      <li>Tenant must provide written notice at least <span class="field">${data.earlyTerminationNoticeDays || 60}</span> days prior to the requested termination date;</li>
      <li>Tenant must pay an early termination fee of <span class="field">${formatCurrency(data.earlyTerminationFee)}</span>;</li>
      <li>Tenant must be current on all rent and other charges;</li>
      <li>Tenant remains liable for rent until the earlier of: (a) the termination date, (b) the date a replacement tenant takes possession, or (c) the original lease expiration date;</li>
      <li>Landlord's acceptance of early termination is at Landlord's sole discretion.</li>
    </ul>
    ` : `
    <p><strong>No Early Termination Right:</strong> Tenant has no right to terminate this Lease prior to the expiration date. 
    Tenant shall remain liable for the full rent due through the end of the Lease term, or until the Premises is re-rented, 
    whichever occurs first. Landlord shall make reasonable efforts to mitigate damages by re-renting the Premises, but Tenant 
    shall be responsible for all costs associated with re-renting, including advertising and leasing commissions.</p>
    `}
    
    <h3>2.4 Surrender of Premises</h3>
    <p>Upon termination or expiration of this Lease, Tenant shall:</p>
    <ul class="list">
      <li>Vacate the Premises completely and remove all personal property;</li>
      <li>Return all keys, access cards, remote controls, and other entry devices;</li>
      <li>Leave the Premises in the same condition as received, ordinary wear and tear excepted;</li>
      <li>Provide Landlord with a forwarding address for return of the security deposit.</li>
    </ul>
    <p>Any personal property remaining on the Premises after termination shall be deemed abandoned and may be disposed of 
    by Landlord at Tenant's expense, in accordance with ${data.state} law.</p>
    
    <h3>2.5 Holdover Tenancy</h3>
    <p>If Tenant remains in possession of the Premises after the expiration or termination of this Lease without Landlord's 
    express written consent, Tenant shall be deemed a <strong>holdover tenant</strong> and shall:</p>
    <ul class="list">
      <li>Pay holdover rent at the rate of <strong>one hundred fifty percent (150%)</strong> of the monthly rent, prorated daily;</li>
      <li>Be subject to immediate eviction proceedings without further notice;</li>
      <li>Be liable for all damages, costs, and attorney's fees incurred by Landlord as a result of the holdover;</li>
      <li>Remain bound by all other terms of this Lease.</li>
    </ul>
    <p>Acceptance of holdover rent by Landlord shall not constitute consent to continued occupancy or create a new tenancy.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 3: RENT & PAYMENT -->
  <h2>Article 3. Rent and Payment Terms</h2>
  <div class="section">
    <h3>3.1 Base Rent</h3>
    <table>
      <tr>
        <th>Monthly Base Rent</th>
        <td><span class="field">${formatCurrency(data.monthlyRent)}</span> per month</td>
      </tr>
      <tr>
        <th>Due Date</th>
        <td>The <span class="field">${getOrdinal(data.rentDueDay)}</span> day of each calendar month</td>
      </tr>
      <tr>
        <th>Grace Period</th>
        <td><span class="field">${data.gracePeriodDays}</span> calendar days (rent received by 11:59 PM on the ${getOrdinal(data.rentDueDay + data.gracePeriodDays)} shall not be deemed late)</td>
      </tr>
    </table>
    
    <h3>3.2 Payment Instructions</h3>
    <p><strong>Accepted Payment Methods:</strong> ${data.acceptedPaymentMethods.join(', ')}</p>
    ${data.paymentInstructions ? `<p><strong>Special Instructions:</strong> ${data.paymentInstructions}</p>` : ''}
    <p>All payments shall be made payable to <span class="field">${data.landlordLegalName}</span> and delivered to the address 
    specified in Section 1.1 or through the designated online payment portal. Rent is deemed paid when actually received by 
    Landlord, not when mailed or initiated.</p>
    
    <h3>3.3 Prorated Rent</h3>
    <p>If the Lease term begins on a day other than the first day of the month, Tenant shall pay prorated rent for the 
    partial month calculated as follows: (Monthly Rent ÷ Days in Month) × Days of Occupancy.</p>
    
    <h3>3.4 Returned Payments</h3>
    ${data.bouncedCheckFee ? `
    <p>A fee of <span class="field">${formatCurrency(data.bouncedCheckFee)}</span> shall be assessed for any payment that is 
    returned, dishonored, or reversed for any reason, including but not limited to insufficient funds, stop payment orders, 
    or closed accounts. This fee is in addition to any late fees that may apply.</p>
    ` : ''}
    <p>After two (2) returned payments during any twelve-month period, Landlord may require all future payments to be made 
    by certified funds (cashier's check or money order) for the remainder of the Lease term.</p>
    
    <h3>3.5 Partial Payments</h3>
    <p>${data.allowPartialPayments 
      ? `Landlord may, at Landlord's sole discretion, accept partial payments. <strong>HOWEVER</strong>, acceptance of any 
         partial payment shall NOT: (a) waive Landlord's right to collect the remaining balance; (b) waive any late fees; 
         (c) constitute a waiver of any default; (d) prevent Landlord from pursuing eviction or other legal remedies; or 
         (e) create an accord and satisfaction. Any partial payment shall be applied first to outstanding fees and charges, 
         then to the oldest unpaid rent.`
      : `<strong>Partial payments shall NOT be accepted.</strong> Landlord reserves the right to refuse any payment that is 
         less than the full amount due. If Landlord does accept a partial payment, such acceptance shall not waive any rights 
         or remedies, and the provisions of Section 3.5 regarding partial payments shall apply.`
    }</p>
    
    <h3>3.6 Application of Payments</h3>
    <p>Regardless of any notation or designation by Tenant, all payments received shall be applied in the following order:</p>
    <ol class="list">
      <li>Court costs and attorney's fees (if any)</li>
      <li>Late fees and returned payment fees</li>
      <li>Other charges and damages</li>
      <li>Past due rent (oldest first)</li>
      <li>Current rent</li>
    </ol>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 4: LATE FEES -->
  <h2>Article 4. Late Fees, Default, and Remedies</h2>
  <div class="section">
    <h3>4.1 Late Fee Assessment</h3>
    ${data.lateFeeAmount || data.lateFeePercent ? `
    <p>If rent is not received in full by the end of the grace period specified in Section 3.1, a late fee shall be assessed as follows:</p>
    <p><strong>Late Fee Amount:</strong> <span class="field">${data.lateFeeAmount ? formatCurrency(data.lateFeeAmount) : `${data.lateFeePercent}% of the monthly rent (${formatCurrency(data.monthlyRent * (data.lateFeePercent || 0) / 100)})`}</span></p>
    <p>The late fee shall be assessed on the <span class="field">${getOrdinal(data.lateFeeStartDay)}</span> day after the rent due date 
    and shall be due immediately upon assessment.</p>
    ${data.maxLateFee ? `<p><strong>Maximum Late Fee:</strong> <span class="field">${formatCurrency(data.maxLateFee)}</span> per month, in accordance with applicable ${data.state} law.</p>` : ''}
    <p>Late fees are considered additional rent and failure to pay late fees constitutes a default under this Lease.</p>
    ` : `
    <p>No late fee shall be charged; however, Landlord reserves all legal remedies for nonpayment of rent.</p>
    `}
    
    <h3>4.2 Notice of Default</h3>
    <p>If rent remains unpaid after the grace period, Landlord may serve Tenant with a <strong>Pay or Quit Notice</strong> 
    (or equivalent notice as required by ${data.state} law) demanding payment of all amounts due within the time period 
    specified by law. Failure to pay within the notice period shall entitle Landlord to pursue eviction.</p>
    
    <h3>4.3 Landlord's Remedies for Nonpayment</h3>
    <p>Upon Tenant's failure to pay rent or other charges when due, Landlord shall have the following remedies, which are 
    cumulative and not exclusive:</p>
    <ul class="list">
      <li><strong>Eviction:</strong> Landlord may terminate this Lease and pursue eviction proceedings (unlawful detainer) 
      in accordance with ${data.state} law;</li>
      <li><strong>Acceleration:</strong> At Landlord's option, all remaining rent for the Lease term may become immediately 
      due and payable;</li>
      <li><strong>Collection:</strong> Landlord may pursue collection of all amounts owed through any lawful means;</li>
      <li><strong>Credit Reporting:</strong> Landlord may report delinquent amounts to credit bureaus;</li>
      <li><strong>Attorney's Fees:</strong> Tenant shall be liable for all reasonable attorney's fees and court costs 
      incurred by Landlord in enforcing this Lease, to the extent permitted by law;</li>
      <li><strong>Interest:</strong> Past due amounts shall accrue interest at the rate of 1.5% per month or the maximum 
      rate permitted by law, whichever is less.</li>
    </ul>
    
    <h3>4.4 No Waiver of Rights</h3>
    <p>Landlord's acceptance of rent or other payments after a default, or Landlord's failure to exercise any remedy, 
    shall not constitute a waiver of Landlord's rights. Landlord may accept rent "with reservation of rights" and still 
    pursue eviction or other remedies for any default.</p>
    
    <h3>4.5 Tenant's Right to Cure</h3>
    <p>For curable defaults other than nonpayment of rent, Tenant shall have the opportunity to cure the default within 
    the time period specified in the notice of default, as required by ${data.state} law. Repeated violations of the same 
    nature may be deemed incurable.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 5: SECURITY DEPOSIT -->
  <h2>Article 5. Security Deposit</h2>
  <div class="section">
    <h3>5.1 Deposit Amount</h3>
    <p><strong>Security Deposit:</strong> <span class="field">${formatCurrency(data.securityDepositAmount)}</span></p>
    <p>The security deposit shall be held by Landlord as security for the faithful performance of Tenant's obligations 
    under this Lease. The deposit is not an advance payment of rent and shall not be applied to rent by Tenant.</p>
    
    <h3>5.2 Permitted Deductions</h3>
    <p>Landlord may deduct from the security deposit amounts reasonably necessary to remedy the following:</p>
    <ul class="list">
      ${data.depositUseCases.map(use => `<li>${use}</li>`).join('')}
    </ul>
    <p>Deductions shall be limited to actual damages and shall not include normal wear and tear.</p>
    
    <h3>5.3 Move-In/Move-Out Inspection</h3>
    <p>Landlord and Tenant shall conduct a joint inspection of the Premises:</p>
    <ul class="list">
      <li><strong>Move-In Inspection:</strong> Within three (3) days of Tenant taking possession, documenting the condition 
      of the Premises on a written checklist signed by both parties;</li>
      <li><strong>Move-Out Inspection:</strong> Tenant may request a pre-move-out inspection to identify deficiencies that 
      may result in deductions. Tenant shall have the opportunity to remedy identified deficiencies before final move-out.</li>
    </ul>
    
    <h3>5.4 Return of Deposit</h3>
    <p>Within <span class="field">${data.depositReturnDays}</span> days after Tenant has vacated the Premises AND returned 
    all keys and access devices, Landlord shall:</p>
    <ul class="list">
      <li>Return the full security deposit; OR</li>
      <li>Provide Tenant with a written itemized statement of deductions and return any remaining balance.</li>
    </ul>
    <p>The statement and any refund shall be sent to the forwarding address provided by Tenant, or if none is provided, 
    to the Premises address.</p>
    
    <h3>5.5 Transfer of Deposit</h3>
    <p>If the Premises is sold or transferred during the Lease term, Landlord shall transfer the security deposit to the 
    new owner and notify Tenant in writing of the transfer and the new owner's name and address. Upon such transfer, 
    Landlord shall be released from liability for the deposit.</p>
    
    ${data.depositNotLastMonthRent ? `
    <div class="legal-notice">
      <strong>IMPORTANT NOTICE REGARDING SECURITY DEPOSIT</strong><br/><br/>
      The security deposit is <strong>NOT</strong> to be used as last month's rent. Tenant must pay the final month's rent 
      in full when due. Any attempt by Tenant to apply the security deposit to rent without Landlord's written consent 
      constitutes a material breach of this Lease and may result in eviction proceedings and forfeiture of the deposit.
    </div>
    ` : ''}
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 6: UTILITIES -->
  <h2>Article 6. Utilities and Services</h2>
  <div class="section">
    <h3>6.1 Utility Responsibility</h3>
    <table>
      <tr>
        <th>Tenant Responsible</th>
        <th>Landlord Responsible</th>
      </tr>
      <tr>
        <td>${data.tenantPaysUtilities.length > 0 ? data.tenantPaysUtilities.join(', ') : 'None'}</td>
        <td>${data.landlordPaysUtilities.length > 0 ? data.landlordPaysUtilities.join(', ') : 'None'}</td>
      </tr>
    </table>
    
    ${data.sharedUtilitiesNote ? `<p><strong>Shared Utilities:</strong> ${data.sharedUtilitiesNote}</p>` : ''}
    
    <h3>6.2 Tenant's Utility Obligations</h3>
    <p>For all utilities designated as Tenant's responsibility, Tenant shall:</p>
    <ul class="list">
      <li>Establish accounts in Tenant's name prior to taking possession;</li>
      <li>Maintain continuous service throughout the tenancy;</li>
      <li>Pay all charges when due;</li>
      <li>Ensure final bills are paid and accounts are closed upon move-out;</li>
      <li>Not allow any utility to be disconnected due to nonpayment.</li>
    </ul>
    <p>Failure to maintain required utilities may constitute a default under this Lease.</p>
    
    <h3>6.3 Service Interruptions</h3>
    <p>Landlord shall not be liable for any interruption, failure, or defect in utility services due to circumstances 
    beyond Landlord's reasonable control, including but not limited to utility company failures, natural disasters, 
    or governmental actions. Such interruptions shall not constitute a breach of this Lease or entitle Tenant to 
    rent abatement, except as may be required by law.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 7: USE OF PROPERTY -->
  <h2>Article 7. Use of Premises</h2>
  <div class="section">
    <h3>7.1 Permitted Use</h3>
    <p>The Premises shall be used <strong>solely and exclusively as a private residential dwelling</strong> for the 
    Tenant(s) and authorized occupants named in this Lease. No other use is permitted without Landlord's prior written consent.</p>
    
    <h3>7.2 Prohibited Uses</h3>
    <p>Tenant shall NOT use or permit the Premises to be used for any of the following:</p>
    <ul class="list">
      <li>Any business, commercial, or professional purpose (including home-based businesses) without prior written consent;</li>
      <li>Any illegal purpose or activity whatsoever;</li>
      <li>Any activity that increases the insurance premium or voids the insurance coverage on the Premises;</li>
      <li>Any activity that constitutes a nuisance or unreasonably disturbs neighbors;</li>
      <li>Short-term rentals, subletting, or listing on platforms such as Airbnb, VRBO, or similar services;</li>
      <li>Storage of hazardous, flammable, explosive, or environmentally harmful materials;</li>
      <li>Any activity that violates applicable zoning laws, HOA rules, or governmental regulations.</li>
    </ul>
    
    <h3>7.3 Compliance with Laws</h3>
    <p>Tenant shall comply with all applicable federal, state, and local laws, ordinances, regulations, and HOA rules 
    affecting the Premises. Tenant shall be responsible for any fines, penalties, or legal fees resulting from Tenant's 
    violation of any such laws or rules.</p>
    
    <h3>7.4 Guests</h3>
    <p>Tenant may have guests for reasonable periods. However, no guest may stay at the Premises for more than 
    <strong>fourteen (14) consecutive days</strong> or more than <strong>thirty (30) days in any twelve-month period</strong> 
    without Landlord's prior written consent. Guests staying beyond these limits shall be considered unauthorized occupants, 
    which constitutes a material breach of this Lease. Tenant is responsible for the conduct of all guests and shall be 
    liable for any damage caused by guests.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 8: PROHIBITED ACTIVITIES -->
  <h2>Article 8. Prohibited Activities and Conduct</h2>
  <div class="section">
    <h3>8.1 Criminal Activity</h3>
    <p>The following activities are <strong>strictly prohibited</strong> and shall constitute grounds for immediate 
    termination of this Lease:</p>
    <ul class="list">
      <li>Possession, use, manufacture, sale, or distribution of illegal drugs or controlled substances;</li>
      <li>Any felony or crime of violence committed on or near the Premises;</li>
      <li>Any criminal activity that threatens the health, safety, or peaceful enjoyment of other residents or neighbors;</li>
      <li>Prostitution or human trafficking;</li>
      <li>Gang-related activity;</li>
      <li>Any activity that would permit forfeiture of the Premises under state or federal law.</li>
    </ul>
    
    <h3>8.2 Safety Violations</h3>
    <p>Tenant shall NOT:</p>
    <ul class="list">
      <li>Store firearms or weapons in violation of applicable laws;</li>
      <li>Store gasoline, propane, or other flammable liquids (except in approved containers for lawn equipment);</li>
      <li>Store hazardous, toxic, or explosive materials;</li>
      <li>Tamper with, disable, or remove smoke detectors, carbon monoxide detectors, or fire safety equipment;</li>
      <li>Block exits, hallways, or fire escapes;</li>
      <li>Use open flames (except normal cooking) or fireworks;</li>
      <li>Overload electrical circuits or use unsafe electrical equipment.</li>
    </ul>
    
    <h3>8.3 Smoking and Vaping Policy</h3>
    ${data.smokingAllowed 
      ? `<p><span class="checkbox checked"></span> <strong>Smoking Permitted in Designated Areas Only:</strong> 
         Smoking and vaping are permitted only in the following designated areas: <span class="field">${data.smokingAreas || 'outdoor areas at least 25 feet from any building entrance'}</span>. 
         Smoking inside the dwelling unit, on balconies/patios attached to the unit, or in common areas is <strong>strictly prohibited</strong>.</p>`
      : `<p><span class="checkbox"></span> <strong>NO SMOKING/VAPING:</strong> Smoking and vaping of any substance (including tobacco, 
         marijuana, and e-cigarettes) are <strong>strictly prohibited</strong> anywhere on the Premises, including but not limited to 
         inside the dwelling unit, on balconies, patios, garages, and all common areas. This prohibition applies to Tenant, all 
         occupants, and all guests.</p>`
    }
    <p>Violation of the smoking policy shall result in: (a) a cleaning/remediation fee of not less than $500; (b) liability for 
    all damages caused by smoke; and (c) potential termination of this Lease.</p>
    
    <h3>8.4 Nuisance Conduct</h3>
    <p>Tenant shall not engage in or permit any conduct that constitutes a nuisance, including but not limited to:</p>
    <ul class="list">
      <li>Excessive noise at any time;</li>
      <li>Harassment, threats, or intimidation of neighbors, other tenants, or Landlord;</li>
      <li>Offensive odors emanating from the Premises;</li>
      <li>Accumulation of trash or debris;</li>
      <li>Any conduct that interferes with the quiet enjoyment of neighboring properties.</li>
    </ul>
    
    <h3>8.5 Consequences of Prohibited Activities</h3>
    <p>Violation of any provision of this Article 8 shall constitute a <strong>material breach</strong> of this Lease and may 
    result in immediate termination without opportunity to cure, to the extent permitted by ${data.state} law. Tenant shall be 
    liable for all damages, costs, fines, and attorney's fees resulting from such violations.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 9: MAINTENANCE & REPAIRS -->
  <h2>Article 9. Maintenance, Repairs, and Condition of Premises</h2>
  <div class="section">
    <h3>9.1 Tenant's Maintenance Obligations</h3>
    <p>Tenant shall maintain the Premises in a clean, sanitary, and safe condition and shall:</p>
    <ul class="list">
      ${(data.tenantMaintenanceResponsibilities || LEASE_DEFAULTS.tenantMaintenanceResponsibilities).map(r => `<li>${r}</li>`).join('')}
      <li>Not make any holes in walls, ceilings, or floors without prior written consent;</li>
      <li>Promptly notify Landlord of any condition requiring repair;</li>
      <li>Take reasonable precautions to prevent frozen pipes in cold weather;</li>
      <li>Not pour grease, oil, or other substances down drains;</li>
      <li>Keep all drains free of obstructions caused by Tenant's use.</li>
    </ul>
    
    <h3>9.2 Landlord's Maintenance Obligations</h3>
    <p>Landlord shall maintain the Premises in compliance with all applicable building and housing codes and shall:</p>
    <ul class="list">
      <li>Maintain the structural components of the building (roof, walls, foundation, floors);</li>
      <li>Maintain plumbing, electrical, heating, and air conditioning systems in good working order;</li>
      <li>Provide and maintain appropriate receptacles for garbage removal;</li>
      <li>Maintain common areas in a safe and clean condition;</li>
      <li>Comply with all requirements of ${data.state} landlord-tenant law regarding habitability;</li>
      <li>Make repairs within a reasonable time after receiving notice from Tenant.</li>
    </ul>
    
    <h3>9.3 Repair Requests and Procedures</h3>
    <p>Tenant must report all maintenance issues and repair needs promptly through the following methods:</p>
    ${data.emergencyContactPhone ? `<p><strong>Phone:</strong> <span class="field">${data.emergencyContactPhone}</span></p>` : ''}
    ${data.emergencyContactEmail ? `<p><strong>Email:</strong> <span class="field">${data.emergencyContactEmail}</span></p>` : ''}
    <p><strong>Online Portal:</strong> Through the property management portal (if available)</p>
    <p>Tenant shall provide Landlord reasonable access to make repairs during normal business hours with appropriate notice.</p>
    
    <h3>9.4 Emergency Repairs</h3>
    <p>In case of emergency (fire, flood, gas leak, sewage backup, no heat in freezing weather, or other conditions 
    threatening health or safety), Tenant shall:</p>
    <ol class="list">
      <li>Call 911 or appropriate emergency services if there is immediate danger;</li>
      <li>Take reasonable steps to prevent further damage (e.g., shut off water, evacuate if necessary);</li>
      <li>Contact Landlord immediately at the emergency contact number;</li>
      <li>Document the emergency with photos/video if safely possible.</li>
    </ol>
    
    <h3>9.5 Tenant-Caused Damage</h3>
    <p>Tenant shall be responsible for the cost of repairing any damage to the Premises caused by:</p>
    <ul class="list">
      <li>Tenant's negligence, carelessness, or intentional acts;</li>
      <li>Acts or omissions of Tenant's family members, guests, or invitees;</li>
      <li>Tenant's failure to report maintenance issues promptly;</li>
      <li>Tenant's misuse of appliances, fixtures, or systems;</li>
      <li>Any damage beyond normal wear and tear.</li>
    </ul>
    <p>Landlord may, at Landlord's option, make such repairs and charge Tenant for the cost, which shall be due as 
    additional rent within ten (10) days of billing.</p>
    
    <h3>9.6 Landlord's Right to Inspect and Repair</h3>
    <p>Landlord reserves the right to enter the Premises to inspect, maintain, and make repairs as provided in Article 11. 
    If Tenant fails to maintain the Premises as required, Landlord may perform necessary maintenance and charge Tenant 
    for the reasonable cost thereof.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 10: ALTERATIONS -->
  <h2>Article 10. Alterations, Improvements, and Fixtures</h2>
  <div class="section">
    <h3>10.1 Prohibition on Alterations</h3>
    <p>Tenant shall NOT make any alterations, additions, improvements, or modifications to the Premises without 
    Landlord's prior written consent. This prohibition includes but is not limited to:</p>
    <ul class="list">
      <li>Painting, wallpapering, or otherwise changing wall surfaces;</li>
      <li>Installing shelving, hooks, anchors, or wall-mounted items that require drilling;</li>
      <li>Changing, adding, or rekeying locks or security devices;</li>
      <li>Installing satellite dishes, antennas, or exterior equipment;</li>
      <li>Making any structural changes or modifications;</li>
      <li>Installing or removing appliances, fixtures, or equipment;</li>
      <li>Modifying electrical, plumbing, or HVAC systems;</li>
      <li>Installing flooring, carpeting, or window treatments that require permanent attachment;</li>
      <li>Any modification that would require a permit.</li>
    </ul>
    
    <h3>10.2 Approved Alterations</h3>
    <p>If Landlord consents to any alteration in writing:</p>
    <ul class="list">
      <li>All work must be performed in a professional, workmanlike manner;</li>
      <li>All work must comply with applicable building codes and permit requirements;</li>
      <li>Tenant shall be responsible for all costs;</li>
      <li>Unless otherwise agreed in writing, all alterations become the property of Landlord upon installation;</li>
      <li>Landlord may require Tenant to restore the Premises to its original condition at move-out, at Tenant's expense.</li>
    </ul>
    
    <h3>10.3 Fixtures</h3>
    <p>All fixtures installed by Tenant shall become the property of Landlord and shall remain with the Premises upon 
    termination, unless Landlord requires their removal. "Fixtures" include any items attached to the Premises that 
    cannot be removed without damage.</p>
    
    <h3>10.4 Tenant's Personal Property</h3>
    <p>Tenant's personal property (furniture, electronics, decorations not permanently attached) remains Tenant's property 
    and must be removed upon termination. Landlord shall not be liable for any damage to or loss of Tenant's personal property.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 11: ENTRY & ACCESS -->
  <h2>Article 11. Landlord's Right of Entry</h2>
  <div class="section">
    <h3>11.1 Notice Required</h3>
    <p>Landlord or Landlord's agents may enter the Premises upon providing at least <span class="field">${data.entryNoticeDays}</span> 
    hours' advance written notice to Tenant, except in cases of emergency.</p>
    
    <h3>11.2 Permitted Purposes for Entry</h3>
    <p>Landlord may enter the Premises for the following purposes:</p>
    <ul class="list">
      ${(data.entryReasons || LEASE_DEFAULTS.entryReasons).map(r => `<li>${r}</li>`).join('')}
      <li>Performing routine inspections (not more than twice per year unless cause exists);</li>
      <li>Complying with legal requirements or court orders;</li>
      <li>Addressing health or safety concerns;</li>
      <li>Any other purpose permitted by ${data.state} law.</li>
    </ul>
    
    <h3>11.3 Emergency Entry</h3>
    <p>Landlord may enter the Premises <strong>without prior notice</strong> in case of emergency, including but not limited to:</p>
    <ul class="list">
      <li>Fire, flood, or water leak;</li>
      <li>Gas leak or suspected gas leak;</li>
      <li>Structural emergency;</li>
      <li>When Landlord reasonably believes entry is necessary to prevent imminent damage to the Premises or to protect 
      the health and safety of occupants or neighbors;</li>
      <li>When Tenant has abandoned the Premises;</li>
      <li>When required by law enforcement with proper legal authority.</li>
    </ul>
    
    <h3>11.4 Tenant's Cooperation</h3>
    <p>Tenant agrees to:</p>
    <ul class="list">
      <li>Provide reasonable access during normal business hours for scheduled entries;</li>
      <li>Not unreasonably withhold consent to entry for legitimate purposes;</li>
      <li>Not change locks or add security devices that would prevent Landlord's access without providing Landlord with keys or codes;</li>
      <li>Ensure that pets are secured during Landlord's entry.</li>
    </ul>
    <p>Tenant's unreasonable refusal to allow entry shall constitute a breach of this Lease.</p>
    
    <h3>11.5 Showing the Premises</h3>
    <p>During the final <span class="field">${data.moveOutNoticeDays}</span> days of the Lease term (or after notice of termination 
    has been given), Landlord may show the Premises to prospective tenants at reasonable times with reasonable notice.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>easonable access during normal business hours for scheduled entries.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 12: PETS -->
  <h2>Article 12. Pet Policy</h2>
  <div class="section">
    ${data.petsAllowed ? `
    <h3>12.1 Pets Permitted</h3>
    <p><span class="checkbox checked"></span> Pets ARE permitted at the Premises, subject to the following terms and conditions:</p>
    
    ${data.petRestrictions ? `<p><strong>Restrictions:</strong> ${data.petRestrictions}</p>` : ''}
    
    <h3>12.2 Pet Fees and Deposits</h3>
    <table>
      ${data.petDeposit ? `<tr><th>Pet Deposit (Refundable)</th><td>${formatCurrency(data.petDeposit)}</td></tr>` : ''}
      ${data.petRent ? `<tr><th>Monthly Pet Rent</th><td>${formatCurrency(data.petRent)} per approved pet</td></tr>` : ''}
    </table>
    
    <h3>12.3 Pet Rules and Requirements</h3>
    <p>Tenant agrees to the following pet rules:</p>
    <ul class="list">
      <li>All pets must be approved by Landlord in writing before being brought onto the Premises;</li>
      <li>Pets must be properly licensed and vaccinated as required by law, with proof provided to Landlord;</li>
      <li>Pets must be kept under control at all times and shall not be allowed to roam freely;</li>
      <li>Tenant shall immediately clean up after pets, both inside and outside the Premises;</li>
      <li>Pets shall not create a nuisance through excessive noise, aggressive behavior, or offensive odors;</li>
      <li>Tenant shall not breed pets or allow pets to reproduce on the Premises;</li>
      <li>Tenant is fully responsible for all damage caused by pets, including damage to flooring, walls, doors, 
      landscaping, and any other part of the Premises;</li>
      ${data.petRules ? `<li>${data.petRules}</li>` : ''}
    </ul>
    
    <h3>12.4 Liability for Pets</h3>
    <p>Tenant shall be solely liable for any injury or damage caused by Tenant's pet(s) to any person or property. 
    Tenant agrees to indemnify, defend, and hold harmless Landlord from any claims, damages, or expenses arising 
    from Tenant's pet(s).</p>
    
    <h3>12.5 Removal of Pets</h3>
    <p>Landlord reserves the right to require removal of any pet that:</p>
    <ul class="list">
      <li>Causes damage to the Premises;</li>
      <li>Creates a nuisance or disturbance;</li>
      <li>Poses a threat to the health or safety of others;</li>
      <li>Violates any pet rule or restriction;</li>
      <li>Is not properly licensed or vaccinated.</li>
    </ul>
    ` : `
    <h3>12.1 No Pets Permitted</h3>
    <p><span class="checkbox"></span> Pets are <strong>NOT permitted</strong> at the Premises.</p>
    <p>This prohibition includes but is not limited to dogs, cats, birds, reptiles, rodents, fish tanks exceeding 
    ten (10) gallons, and any other animals. Visiting pets are also prohibited.</p>
    
    <h3>12.2 Service and Assistance Animals</h3>
    <p>This pet prohibition does not apply to service animals or emotional support animals for which Tenant has 
    provided proper documentation as required by law. Tenant must request reasonable accommodation and provide 
    supporting documentation before bringing any assistance animal onto the Premises.</p>
    
    <h3>12.3 Violation of Pet Policy</h3>
    <p>Unauthorized pets constitute a material breach of this Lease. If an unauthorized pet is discovered:</p>
    <ul class="list">
      <li>Tenant shall immediately remove the pet;</li>
      <li>Tenant shall pay a pet violation fee of $500 or actual damages, whichever is greater;</li>
      <li>Tenant shall be liable for all damage caused by the pet;</li>
      <li>Landlord may terminate this Lease upon proper notice.</li>
    </ul>
    `}
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 13: NOISE & BEHAVIOR -->
  <h2>Article 13. Quiet Enjoyment and Conduct</h2>
  <div class="section">
    <h3>13.1 Covenant of Quiet Enjoyment</h3>
    <p>Landlord covenants that Tenant, upon paying rent and performing all obligations under this Lease, shall 
    peacefully and quietly have, hold, and enjoy the Premises during the Lease term without interference from 
    Landlord or anyone claiming through Landlord.</p>
    
    <h3>13.2 Tenant's Conduct Obligations</h3>
    <p>In consideration of the covenant of quiet enjoyment, Tenant agrees to conduct themselves and ensure that 
    all occupants and guests conduct themselves in a manner that does not disturb the peace and quiet of neighbors 
    or other tenants.</p>
    
    ${data.quietHoursStart && data.quietHoursEnd ? `
    <h3>13.3 Quiet Hours</h3>
    <p><strong>Designated Quiet Hours:</strong> <span class="field">${data.quietHoursStart}</span> to <span class="field">${data.quietHoursEnd}</span></p>
    <p>During quiet hours, Tenant shall:</p>
    <ul class="list">
      <li>Keep all noise to a minimum;</li>
      <li>Not play music, television, or other audio at volumes audible outside the Premises;</li>
      <li>Not engage in activities that create excessive noise;</li>
      <li>Ensure guests comply with quiet hours.</li>
    </ul>
    ` : ''}
    
    <h3>13.4 General Conduct Requirements</h3>
    <p>At all times, Tenant shall:</p>
    <ul class="list">
      <li>Comply with all local noise ordinances;</li>
      <li>Not engage in loud parties, gatherings, or activities that disturb neighbors;</li>
      <li>Keep music, television, and other audio at reasonable volumes;</li>
      <li>Ensure that guests comply with all conduct requirements;</li>
      <li>Not engage in harassment, threats, or intimidating behavior toward anyone;</li>
      <li>Promptly address any complaints from neighbors or Landlord regarding noise or conduct.</li>
    </ul>
    
    <h3>13.5 Consequences of Violations</h3>
    <p>Noise complaints and conduct violations shall be addressed as follows:</p>
    <ul class="list">
      <li><strong>First Violation:</strong> Written warning;</li>
      <li><strong>Second Violation:</strong> Written notice of lease violation with opportunity to cure;</li>
      <li><strong>Third Violation:</strong> Notice of termination as permitted by ${data.state} law.</li>
    </ul>
    <p>Severe violations (violence, threats, criminal activity) may result in immediate termination without prior warnings.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 14: SAFETY & HEALTH -->
  <h2>Article 14. Safety, Health, and Hazard Prevention</h2>
  <div class="section">
    <h3>14.1 Safety Equipment</h3>
    <p>Tenant acknowledges that the Premises is equipped with smoke detectors and carbon monoxide detectors (where required). 
    Tenant agrees to:</p>
    <ul class="list">
      <li>Test smoke and CO detectors monthly;</li>
      <li>Replace batteries as needed (unless hardwired);</li>
      <li>Never disable, disconnect, or tamper with any safety device;</li>
      <li>Immediately notify Landlord if any detector is malfunctioning;</li>
      <li>Not remove or cover any safety device.</li>
    </ul>
    <p>Tampering with safety equipment is a serious violation that may result in immediate lease termination and may 
    constitute a criminal offense.</p>
    
    <h3>14.2 Fire Safety</h3>
    <p>Tenant shall:</p>
    <ul class="list">
      <li>Keep all exits and pathways clear of obstructions;</li>
      <li>Not block or lock fire exits or emergency routes;</li>
      <li>Not use or store flammable liquids (except small quantities for household use);</li>
      <li>Not use open flames except for normal cooking;</li>
      <li>Not use space heaters unless approved by Landlord;</li>
      <li>Not overload electrical outlets or use damaged electrical cords;</li>
      <li>Know the location of fire extinguishers and emergency exits.</li>
    </ul>
    
    <h3>14.3 Mold Prevention</h3>
    <p>Tenant shall take reasonable steps to prevent mold growth by:</p>
    <ul class="list">
      <li>Maintaining adequate ventilation, especially in bathrooms and kitchens;</li>
      <li>Using exhaust fans when showering or cooking;</li>
      <li>Promptly reporting any water leaks, moisture problems, or visible mold;</li>
      <li>Not blocking air vents or HVAC returns;</li>
      <li>Keeping the Premises reasonably clean and dry.</li>
    </ul>
    
    <h3>14.4 Pest Prevention</h3>
    <p>Tenant shall:</p>
    <ul class="list">
      <li>Keep the Premises clean and free of conditions that attract pests;</li>
      <li>Properly store food in sealed containers;</li>
      <li>Dispose of garbage regularly;</li>
      <li>Promptly report any pest infestations to Landlord;</li>
      <li>Cooperate with pest control treatments.</li>
    </ul>
    
    <h3>14.5 Hazardous Materials</h3>
    <p>Tenant shall not store, use, or dispose of any hazardous materials on the Premises, except for normal household 
    cleaning products used in accordance with manufacturer instructions.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 15: INSURANCE -->
  <h2>Article 15. Insurance and Liability</h2>
  <div class="section">
    <h3>15.1 Renter's Insurance</h3>
    ${data.rentersInsuranceRequired ? `
    <p><strong>RENTER'S INSURANCE IS REQUIRED.</strong> Tenant must obtain and maintain a renter's insurance policy 
    throughout the entire term of this Lease with the following minimum coverage:</p>
    <ul class="list">
      <li><strong>Personal Liability:</strong> <span class="field">${data.minInsuranceCoverage ? formatCurrency(data.minInsuranceCoverage) : '$100,000'}</span> minimum</li>
      <li><strong>Personal Property:</strong> Sufficient to cover Tenant's belongings</li>
      <li><strong>Additional Insured:</strong> Landlord shall be named as an additional interested party</li>
    </ul>
    
    <p>Tenant shall provide proof of insurance:</p>
    <ul class="list">
      <li>Prior to taking possession of the Premises;</li>
      <li>Upon each policy renewal;</li>
      <li>Within five (5) days of Landlord's request.</li>
    </ul>
    
    <p><strong>Failure to maintain required insurance is a material breach of this Lease</strong> and may result in 
    termination. If Tenant fails to maintain insurance, Landlord may obtain insurance on Tenant's behalf and charge 
    Tenant for the premium as additional rent.</p>
    ` : `
    <p><strong>Renter's Insurance Strongly Recommended:</strong> While not required under this Lease, Landlord 
    <strong>strongly recommends</strong> that Tenant obtain renter's insurance to protect personal belongings and 
    provide liability coverage. Tenant acknowledges that Landlord's insurance does NOT cover Tenant's personal property 
    or Tenant's liability.</p>
    `}
    
    <h3>15.2 Landlord's Insurance Disclaimer</h3>
    <div class="legal-notice">
      <strong>IMPORTANT NOTICE:</strong> Landlord's insurance policy covers only the building structure and Landlord's 
      liability. <strong>Landlord's insurance does NOT cover:</strong>
      <ul style="margin-top: 8pt;">
        <li>Tenant's personal property (furniture, electronics, clothing, etc.);</li>
        <li>Tenant's liability for injuries to guests;</li>
        <li>Loss or damage due to theft, fire, water damage, or any other cause;</li>
        <li>Additional living expenses if the Premises becomes uninhabitable.</li>
      </ul>
      <p style="margin-top: 8pt;"><strong>Tenant assumes all risk of loss for personal property.</strong></p>
    </div>
    
    <h3>15.3 Waiver of Subrogation</h3>
    <p>To the extent permitted by their respective insurance policies, Landlord and Tenant each waive any right of 
    subrogation against the other for losses covered by insurance.</p>
    
    <h3>15.4 Indemnification</h3>
    <p>Tenant agrees to indemnify, defend, and hold harmless Landlord, Landlord's agents, employees, and contractors 
    from and against any and all claims, actions, damages, liability, and expense (including reasonable attorney's fees) 
    arising from:</p>
    <ul class="list">
      <li>Tenant's use of the Premises;</li>
      <li>Any activity, work, or thing done, permitted, or suffered by Tenant in or about the Premises;</li>
      <li>Any breach or default by Tenant under this Lease;</li>
      <li>Any negligent or wrongful act or omission of Tenant or Tenant's guests, invitees, or occupants;</li>
      <li>Any injury to person or property occurring on the Premises during Tenant's occupancy.</li>
    </ul>
    <p>This indemnification shall survive the termination of this Lease.</p>
    
    <h3>15.5 Limitation of Landlord's Liability</h3>
    <p>Landlord shall not be liable for any damage or injury to Tenant, Tenant's guests, or Tenant's property unless 
    caused by Landlord's gross negligence or willful misconduct. Landlord shall not be liable for:</p>
    <ul class="list">
      <li>Theft, burglary, or criminal acts of third parties;</li>
      <li>Damage caused by other tenants or their guests;</li>
      <li>Damage caused by fire, flood, or other casualty (except where caused by Landlord's negligence);</li>
      <li>Interruption of utilities or services beyond Landlord's control;</li>
      <li>Conditions existing at the time Tenant took possession that were known or should have been known to Tenant.</li>
    </ul>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 16: SUBLETTING -->
  <h2>Article 16. Assignment and Subletting</h2>
  <div class="section">
    <h3>16.1 Prohibition</h3>
    <p>Tenant shall NOT assign this Lease or sublet the Premises, or any part thereof, without Landlord's prior 
    written consent, which may be withheld in Landlord's sole discretion.</p>
    
    <h3>16.2 Prohibited Activities</h3>
    <p>Without Landlord's prior written consent, Tenant shall not:</p>
    <ul class="list">
      <li>Assign, transfer, or encumber this Lease or any interest therein;</li>
      <li>Sublet or rent out any portion of the Premises;</li>
      <li>Allow any person not named on this Lease to reside at the Premises;</li>
      <li>List the Premises on any short-term rental platform (Airbnb, VRBO, HomeAway, etc.);</li>
      <li>Allow the Premises to be used by any person or entity other than Tenant;</li>
      <li>Grant any license or concession with respect to the Premises.</li>
    </ul>
    
    <h3>16.3 Effect of Unauthorized Transfer</h3>
    <p>Any attempted assignment, subletting, or transfer without Landlord's written consent shall be:</p>
    <ul class="list">
      <li>Void and of no effect;</li>
      <li>A material breach of this Lease;</li>
      <li>Grounds for immediate termination.</li>
    </ul>
    
    <h3>16.4 Consent Does Not Release Tenant</h3>
    <p>If Landlord consents to any assignment or subletting:</p>
    <ul class="list">
      <li>The original Tenant shall remain fully liable for all obligations under this Lease;</li>
      <li>Consent to one assignment or subletting shall not be deemed consent to any subsequent assignment or subletting;</li>
      <li>Landlord may require the assignee or subtenant to sign an agreement assuming all Lease obligations;</li>
      <li>Landlord may charge a reasonable administrative fee for processing the request.</li>
    </ul>
    
    <h3>16.5 Short-Term Rentals Strictly Prohibited</h3>
    <p>Listing the Premises on any short-term rental platform or renting the Premises for periods of less than 
    thirty (30) days is <strong>strictly prohibited</strong> and shall constitute a material breach of this Lease, 
    regardless of whether Tenant is present during such rental. Violation may result in:</p>
    <ul class="list">
      <li>Immediate termination of this Lease;</li>
      <li>Forfeiture of the security deposit;</li>
      <li>Liability for all income received from unauthorized rentals;</li>
      <li>Liability for all damages, fines, and legal fees incurred by Landlord.</li>
    </ul>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 17: DEFAULT & VIOLATIONS -->
  <h2>Article 17. Default, Termination, and Remedies</h2>
  <div class="section">
    <h3>17.1 Events of Default by Tenant</h3>
    <p>The following shall constitute events of default under this Lease:</p>
    <ul class="list">
      <li>Failure to pay rent or any other charge when due;</li>
      <li>Failure to comply with any term, covenant, or condition of this Lease;</li>
      <li>Abandonment of the Premises;</li>
      <li>Making any false or misleading statement in the rental application;</li>
      <li>Unauthorized occupants, pets, or subletting;</li>
      <li>Illegal activity on the Premises;</li>
      <li>Damage to the Premises beyond normal wear and tear;</li>
      <li>Disturbance of neighbors or other tenants;</li>
      <li>Failure to maintain required insurance (if applicable);</li>
      <li>Violation of any law, ordinance, or regulation affecting the Premises;</li>
      <li>Bankruptcy, insolvency, or assignment for benefit of creditors by Tenant.</li>
    </ul>
    
    <h3>17.2 Notice and Opportunity to Cure</h3>
    <p>Upon occurrence of a default:</p>
    <ul class="list">
      <li><strong>Nonpayment of Rent:</strong> Landlord shall provide notice as required by ${data.state} law 
      (typically 3-5 days) to pay or quit;</li>
      <li><strong>Curable Violations:</strong> Landlord shall provide written notice specifying the violation and 
      a reasonable time to cure as required by ${data.state} law;</li>
      <li><strong>Incurable Violations:</strong> Certain violations (illegal activity, violence, repeated violations) 
      may result in termination without opportunity to cure, as permitted by law.</li>
    </ul>
    
    <h3>17.3 Landlord's Remedies</h3>
    <p>Upon default by Tenant, Landlord shall have the following remedies, which are cumulative and not exclusive:</p>
    <ul class="list">
      <li><strong>Termination:</strong> Terminate this Lease and Tenant's right to possession;</li>
      <li><strong>Eviction:</strong> Pursue eviction (unlawful detainer) proceedings;</li>
      <li><strong>Damages:</strong> Recover all damages, including unpaid rent, late fees, repair costs, and 
      re-letting expenses;</li>
      <li><strong>Acceleration:</strong> Declare all remaining rent for the Lease term immediately due;</li>
      <li><strong>Re-entry:</strong> Re-enter and take possession of the Premises as permitted by law;</li>
      <li><strong>Re-letting:</strong> Re-let the Premises on Tenant's behalf and hold Tenant liable for any deficiency;</li>
      <li><strong>Attorney's Fees:</strong> Recover reasonable attorney's fees and court costs to the extent permitted by law;</li>
      <li><strong>Other Remedies:</strong> Pursue any other remedy available at law or in equity.</li>
    </ul>
    
    <h3>17.4 Abandonment</h3>
    <p>The Premises shall be deemed abandoned if:</p>
    <ul class="list">
      <li>Tenant is absent for more than <span class="field">15</span> consecutive days without notice to Landlord 
      and rent is unpaid; OR</li>
      <li>Tenant has removed substantially all personal property and rent is unpaid; OR</li>
      <li>Tenant has given notice of intent to vacate and has vacated.</li>
    </ul>
    <p>Upon abandonment, Landlord may re-enter, take possession, and re-let the Premises. Any personal property 
    remaining shall be handled in accordance with ${data.state} law regarding abandoned property.</p>
    
    <h3>17.5 Mitigation of Damages</h3>
    <p>If Tenant defaults and vacates, Landlord shall make reasonable efforts to re-let the Premises and mitigate 
    damages. However, Landlord shall not be required to:</p>
    <ul class="list">
      <li>Accept any prospective tenant who does not meet Landlord's standard qualification criteria;</li>
      <li>Prioritize re-letting the Premises over other available units;</li>
      <li>Lease the Premises for less than fair market rent.</li>
    </ul>
    
    <h3>17.6 Waiver</h3>
    <p>Landlord's failure to enforce any provision of this Lease, or acceptance of rent with knowledge of a default, 
    shall not constitute a waiver of Landlord's right to enforce that provision or any other provision in the future. 
    Any waiver must be in writing and signed by Landlord to be effective.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 18: MOVE-OUT -->
  <h2>Article 18. Move-Out Procedures and Requirements</h2>
  <div class="section">
    <h3>18.1 Notice of Intent to Vacate</h3>
    <p>Tenant must provide written notice of intent to vacate at least <span class="field">${data.moveOutNoticeDays}</span> 
    days prior to the intended move-out date. Notice must:</p>
    <ul class="list">
      <li>Be in writing (email to the address in Section 1.1 is acceptable);</li>
      <li>Specify the exact date Tenant will vacate;</li>
      <li>Be delivered to Landlord (not just mailed) by the required notice date.</li>
    </ul>
    <p>Failure to provide proper notice may result in liability for additional rent.</p>
    
    <h3>18.2 Move-Out Condition Requirements</h3>
    <p>Upon vacating, Tenant shall leave the Premises in the following condition:</p>
    <ul class="list">
      ${(data.moveOutCleaningRequirements || LEASE_DEFAULTS.moveOutCleaningRequirements).map(r => `<li>${r}</li>`).join('')}
      <li>All light bulbs working;</li>
      <li>All smoke detector and CO detector batteries replaced (if applicable);</li>
      <li>HVAC filters replaced;</li>
      <li>No damage beyond normal wear and tear;</li>
      <li>All repairs for Tenant-caused damage completed.</li>
    </ul>
    
    <h3>18.3 Return of Keys and Access Devices</h3>
    <p>Tenant must return ALL of the following on or before the move-out date:</p>
    <ul class="list">
      <li>All keys (including copies made by Tenant);</li>
      <li>Garage door openers and remotes;</li>
      <li>Access cards, fobs, or codes;</li>
      <li>Mailbox keys;</li>
      <li>Pool/amenity keys or cards;</li>
      <li>Any other access devices provided by Landlord.</li>
    </ul>
    <p>Tenant shall be charged for replacement of any unreturned items.</p>
    
    <h3>18.4 Forwarding Address</h3>
    <p>Tenant must provide Landlord with a forwarding address in writing for return of the security deposit and 
    any other correspondence. If no forwarding address is provided, the security deposit accounting will be sent 
    to the Premises address.</p>
    
    <h3>18.5 Final Walkthrough Inspection</h3>
    <p>Tenant may request a final walkthrough inspection with Landlord prior to move-out to identify any issues 
    that may result in deductions from the security deposit. Tenant shall have the opportunity to remedy identified 
    deficiencies before the final move-out inspection.</p>
    
    <h3>18.6 Holdover</h3>
    <p>If Tenant fails to vacate by the termination date, the provisions of Section 2.5 (Holdover Tenancy) shall apply.</p>
    
    <h3>18.7 Abandoned Property</h3>
    <p>Any personal property remaining on the Premises after Tenant has vacated shall be deemed abandoned. Landlord 
    may dispose of abandoned property in accordance with ${data.state} law. Tenant shall be liable for all costs 
    of removal, storage, and disposal of abandoned property.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- SECTION 19: LEGAL CLAUSES -->
  <h2>Article 19. General Provisions</h2>
  <div class="section">
    <h3>19.1 Governing Law and Jurisdiction</h3>
    <p>This Agreement shall be governed by and construed in accordance with the laws of the State of 
    <span class="field">${data.state}</span>. Any legal action arising from this Lease shall be brought in the 
    courts of the county where the Premises is located.</p>
    
    <h3>19.2 Severability</h3>
    <p>If any provision of this Lease is found by a court of competent jurisdiction to be invalid, illegal, or 
    unenforceable, such finding shall not affect the validity of the remaining provisions, which shall continue 
    in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it 
    valid and enforceable while preserving the parties' original intent.</p>
    
    <h3>19.3 Entire Agreement</h3>
    <p>This Lease, together with any addenda, exhibits, and attachments, constitutes the entire agreement between 
    the parties concerning the Premises and supersedes all prior negotiations, representations, warranties, and 
    agreements between the parties. No oral agreements, representations, or understandings shall be binding unless 
    reduced to writing and signed by both parties.</p>
    
    <h3>19.4 Amendments</h3>
    <p>This Lease may only be amended, modified, or supplemented by a written instrument signed by both Landlord 
    and Tenant. No oral modification shall be effective.</p>
    
    <h3>19.5 Notices</h3>
    <p>All notices required or permitted under this Lease shall be in writing and shall be deemed delivered when:</p>
    <ul class="list">
      <li>Personally delivered to the party;</li>
      <li>Sent by certified mail, return receipt requested, three (3) days after mailing;</li>
      <li>Sent by email to the address specified in this Lease, upon confirmation of receipt;</li>
      <li>Posted on the Premises door (for notices to Tenant only, where permitted by law).</li>
    </ul>
    <p>Notices to Landlord shall be sent to the address in Section 1.1. Notices to Tenant shall be sent to the 
    Premises address or the email address provided.</p>
    
    <h3>19.6 Joint and Several Liability</h3>
    <p>If there is more than one Tenant, all Tenants are <strong>jointly and severally liable</strong> for all 
    obligations under this Lease. This means:</p>
    <ul class="list">
      <li>Each Tenant is individually responsible for the full amount of rent and all other obligations;</li>
      <li>Landlord may pursue any one Tenant for the full amount owed;</li>
      <li>A default by one Tenant is a default by all Tenants;</li>
      <li>Notice to one Tenant is deemed notice to all Tenants.</li>
    </ul>
    
    <h3>19.7 Binding Effect</h3>
    <p>This Lease shall be binding upon and inure to the benefit of the parties and their respective heirs, 
    executors, administrators, successors, and permitted assigns.</p>
    
    <h3>19.8 Time is of the Essence</h3>
    <p>Time is of the essence with respect to all provisions of this Lease.</p>
    
    <h3>19.9 Attorney's Fees</h3>
    <p>In any action or proceeding arising out of this Lease, the prevailing party shall be entitled to recover 
    reasonable attorney's fees and costs from the non-prevailing party, to the extent permitted by ${data.state} law.</p>
    
    <h3>19.10 Waiver of Jury Trial</h3>
    <p>TO THE EXTENT PERMITTED BY LAW, LANDLORD AND TENANT HEREBY WAIVE THEIR RESPECTIVE RIGHTS TO A JURY TRIAL 
    OF ANY CLAIM OR CAUSE OF ACTION ARISING OUT OF OR RELATED TO THIS LEASE.</p>
    
    <h3>19.11 Counterparts and Electronic Signatures</h3>
    <p>This Lease may be executed in counterparts, each of which shall be deemed an original. Electronic signatures 
    shall be deemed valid and binding to the same extent as original signatures.</p>
    
    <h3>19.12 Headings</h3>
    <p>The headings in this Lease are for convenience only and shall not affect the interpretation of any provision.</p>
    
    <h3>19.13 No Partnership or Agency</h3>
    <p>Nothing in this Lease shall be construed to create a partnership, joint venture, or agency relationship 
    between Landlord and Tenant.</p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- ADDITIONAL TERMS -->
  ${data.parkingRules || data.guestPolicy || data.hoaRules || (data.additionalTerms && data.additionalTerms.length > 0) ? `
  <h2>20. Additional Terms</h2>
  <div class="section">
    ${data.parkingRules ? `<p><strong>Parking:</strong> ${data.parkingRules}</p>` : ''}
    ${data.guestPolicy ? `<p><strong>Guest Policy:</strong> ${data.guestPolicy}</p>` : ''}
    ${data.hoaRules ? `<p><strong>HOA Rules:</strong> ${data.hoaRules}</p>` : ''}
    ${data.additionalTerms && data.additionalTerms.length > 0 ? `
    <p><strong>Additional Terms:</strong></p>
    <ul class="list">
      ${data.additionalTerms.map(term => `<li>${term}</li>`).join('')}
    </ul>
    ` : ''}
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>
  ` : ''}

  <!-- DISCLOSURES -->
  ${data.leadPaintDisclosure || data.bedBugDisclosure || data.moldDisclosure ? `
  <div class="page-break"></div>
  <h2>Required Disclosures</h2>
  <div class="section">
    ${data.leadPaintDisclosure ? `
    <div class="legal-notice">
      <strong>LEAD-BASED PAINT DISCLOSURE (Pre-1978 Housing)</strong><br/>
      Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose 
      health hazards if not managed properly. Lead exposure is especially harmful to young children and pregnant women.
      <br/><br/>
      Landlord has provided Tenant with the EPA pamphlet "Protect Your Family From Lead in Your Home" and has 
      disclosed any known lead-based paint hazards.
      <br/><br/>
      <span class="checkbox${data.leadPaintDisclosure ? ' checked' : ''}"></span> Landlord has no knowledge of lead-based paint hazards
      <br/>
      <span class="checkbox"></span> Landlord has knowledge of the following lead-based paint hazards: _______________
    </div>
    ` : ''}
    
    ${data.bedBugDisclosure ? `
    <div class="legal-notice">
      <strong>BED BUG DISCLOSURE</strong><br/>
      Landlord has no knowledge of any bed bug infestation at the Premises within the past year. Tenant agrees to 
      report any signs of bed bugs immediately and to cooperate with any treatment procedures.
    </div>
    ` : ''}
    
    ${data.moldDisclosure ? `
    <div class="legal-notice">
      <strong>MOLD DISCLOSURE</strong><br/>
      Landlord has no knowledge of mold at the Premises. Tenant agrees to maintain proper ventilation, report any 
      water leaks or moisture problems immediately, and take reasonable steps to prevent mold growth.
    </div>
    ` : ''}
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>
  ` : ''}

  <!-- SIGNATURE PAGE -->
  <div class="page-break"></div>
  <h2>Signatures</h2>
  <div class="signature-section">
    <p>By signing below, the parties acknowledge that they have read, understand, and agree to all terms and 
    conditions of this Residential Lease Agreement.</p>
    
    <div class="sig-row">
      <div class="sig-group">
        <p class="sig-label">LANDLORD:</p>
        <p>${data.landlordLegalName}</p>
        <div class="signature-block"></div>
        <p>Signature</p>
        <p style="margin-top: 12pt;">Date: <span class="date-line"></span></p>
      </div>
    </div>
    
    ${data.tenantNames.map((name, index) => `
    <div class="sig-row">
      <div class="sig-group">
        <p class="sig-label">TENANT ${data.tenantNames.length > 1 ? index + 1 : ''}:</p>
        <p>${name}</p>
        <div class="signature-block"></div>
        <p>Signature</p>
        <p style="margin-top: 12pt;">Date: <span class="date-line"></span></p>
      </div>
    </div>
    `).join('')}
  </div>

  <!-- STATE-SPECIFIC REQUIRED DISCLOSURES -->
  ${generateStateDisclosures(data.state, data)}

  <!-- LANDLORD CONTACT INFORMATION -->
  <div class="page-break"></div>
  <h2>Landlord Contact Information</h2>
  <div class="section">
    <p>For all matters related to this lease, including maintenance requests, rent payments, and notices, contact:</p>
    <table>
      <tr><th>Landlord/Property Manager</th><td>${data.landlordLegalName}${data.landlordCompanyName ? ` (${data.landlordCompanyName})` : ''}</td></tr>
      ${data.landlordAddress ? `<tr><th>Address</th><td>${data.landlordAddress}</td></tr>` : ''}
      ${data.landlordPhone ? `<tr><th>Phone</th><td>${data.landlordPhone}</td></tr>` : ''}
      ${data.landlordEmail ? `<tr><th>Email</th><td>${data.landlordEmail}</td></tr>` : ''}
      ${data.emergencyContactPhone ? `<tr><th>Emergency Contact</th><td>${data.emergencyContactPhone}</td></tr>` : ''}
    </table>
  </div>

  <!-- TENANT RIGHTS NOTICE -->
  <h2>Tenant Rights Notice</h2>
  <div class="section">
    <div class="legal-notice">
      <strong>KNOW YOUR RIGHTS AS A TENANT</strong><br/><br/>
      As a tenant in ${data.state}, you have certain rights protected by law, including but not limited to:
      <ul style="margin-top: 8pt;">
        <li>The right to a habitable dwelling</li>
        <li>The right to privacy and proper notice before landlord entry</li>
        <li>The right to have your security deposit returned (minus lawful deductions) within the time required by law</li>
        <li>The right to be free from discrimination based on race, color, religion, sex, national origin, familial status, or disability</li>
        <li>The right to proper notice before eviction proceedings</li>
        <li>The right to request repairs for conditions affecting health and safety</li>
      </ul>
      <p style="margin-top: 8pt;">For more information about tenant rights in ${data.state}, contact your local housing authority or tenant rights organization.</p>
    </div>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- LEGAL DISCLAIMER -->
  <div class="page-break"></div>
  <h2>Legal Notice & Disclaimer</h2>
  <div class="section">
    <div class="legal-notice" style="font-size: 9pt;">
      <strong>IMPORTANT LEGAL NOTICE</strong><br/><br/>
      
      This lease agreement was generated using PropertyFlow HQ's Lease Builder tool. By using this document, all parties acknowledge and agree to the following:<br/><br/>
      
      <strong>1. NOT LEGAL ADVICE:</strong> PropertyFlow HQ is a property management software platform, NOT a law firm. This document is provided as a tool to assist landlords and does not constitute legal advice.<br/><br/>
      
      <strong>2. NO ATTORNEY-CLIENT RELATIONSHIP:</strong> Use of this lease builder does not create an attorney-client relationship between any party and PropertyFlow HQ or any of its affiliates.<br/><br/>
      
      <strong>3. LANDLORD RESPONSIBILITY:</strong> The landlord is solely responsible for ensuring this lease complies with all applicable federal, state, and local laws, including but not limited to fair housing laws, landlord-tenant regulations, and disclosure requirements.<br/><br/>
      
      <strong>4. REVIEW RECOMMENDED:</strong> We strongly recommend having this lease reviewed by a licensed attorney in your jurisdiction before use.<br/><br/>
      
      <strong>5. STATE-SPECIFIC REQUIREMENTS:</strong> While this lease builder includes state-aware provisions for ${data.state}, laws vary significantly by locality. Additional disclosures or specific language may be required in your area.<br/><br/>
      
      <strong>6. NO WARRANTY:</strong> This document is provided "as is" without warranty of any kind. PropertyFlow HQ makes no guarantees regarding the enforceability of any provision in this lease.
    </div>
    
    <p style="margin-top: 12pt;"><strong>By signing this lease, all parties confirm they have read and understood this legal notice.</strong></p>
    
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
  </div>

  <!-- DOCUMENT FOOTER -->
  <div style="margin-top: 48pt; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 12pt;">
    <p><strong>PropertyFlow HQ - State-Aware Lease Builder</strong></p>
    <p>Designed to align with landlord-tenant law • Used by landlords nationwide</p>
    <p>Document ID: ${Date.now().toString(36).toUpperCase()} | Generated: ${formatDate(new Date())} | State: ${data.state}</p>
    <p style="margin-top: 8pt; font-size: 8pt;">This is not a guarantee of legal validity. Consult with a licensed attorney for legal advice.</p>
  </div>

</body>
</html>`;
}

/**
 * Generate state-specific disclosure sections
 */
function generateStateDisclosures(state: string, data: LeaseBuilderData): string {
  const disclosures = getStateDisclosures(state);
  const sections: string[] = [];
  
  sections.push('<div class="page-break"></div>');
  sections.push('<h2>Required Disclosures for ' + state + '</h2>');
  sections.push('<div class="section">');
  sections.push('<p>The following disclosures are required by ' + state + ' law:</p>');
  
  // Lead-based paint (federal requirement for pre-1978)
  if (disclosures.leadPaint || data.leadPaintDisclosure) {
    sections.push(`
    <div class="legal-notice">
      <strong>LEAD-BASED PAINT DISCLOSURE (Required for Pre-1978 Housing)</strong><br/><br/>
      Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose 
      health hazards if not managed properly. Lead exposure is especially harmful to young children and pregnant women.
      <br/><br/>
      <strong>Landlord's Disclosure:</strong><br/>
      <span class="checkbox"></span> Landlord has no knowledge of lead-based paint and/or lead-based paint hazards in the housing.<br/>
      <span class="checkbox"></span> Landlord has knowledge of lead-based paint and/or lead-based paint hazards: _______________________
      <br/><br/>
      <strong>Records and Reports:</strong><br/>
      <span class="checkbox"></span> Landlord has no reports or records pertaining to lead-based paint.<br/>
      <span class="checkbox"></span> Landlord has provided the following records: _______________________
      <br/><br/>
      <strong>Tenant Acknowledgment:</strong><br/>
      <span class="checkbox"></span> Tenant has received the EPA pamphlet "Protect Your Family From Lead in Your Home."<br/>
      <span class="checkbox"></span> Tenant has received all available records and reports.
    </div>
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
    `);
  }
  
  // Mold disclosure
  if (disclosures.mold || data.moldDisclosure) {
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>MOLD DISCLOSURE</strong><br/><br/>
      Landlord discloses the following regarding mold at the premises:<br/>
      <span class="checkbox"></span> Landlord has no knowledge of mold or mold-producing conditions at the premises.<br/>
      <span class="checkbox"></span> Landlord has knowledge of the following mold conditions: _______________________
      <br/><br/>
      <strong>Tenant Responsibilities:</strong> Tenant agrees to maintain proper ventilation, promptly report any water leaks 
      or moisture problems, and take reasonable steps to prevent mold growth. Tenant will immediately notify Landlord of any 
      visible mold or musty odors.
    </div>
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
    `);
  }
  
  // Bed bug disclosure
  if (disclosures.bedBugs || data.bedBugDisclosure) {
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>BED BUG DISCLOSURE</strong><br/><br/>
      <span class="checkbox"></span> Landlord has no knowledge of any bed bug infestation at the premises within the past year.<br/>
      <span class="checkbox"></span> The premises has had a bed bug infestation within the past year. Details: _______________________
      <br/><br/>
      <strong>Tenant Responsibilities:</strong> Tenant agrees to report any signs of bed bugs immediately and to cooperate 
      fully with any inspection and treatment procedures. Tenant will not introduce used furniture or mattresses without 
      proper inspection.
    </div>
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
    `);
  }
  
  // Radon disclosure
  if (disclosures.radon || data.radonDisclosure) {
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>RADON DISCLOSURE</strong><br/><br/>
      Radon is a naturally occurring radioactive gas that can accumulate in buildings and may cause health problems. 
      The EPA recommends testing for radon and taking action if levels exceed 4 pCi/L.<br/><br/>
      <span class="checkbox"></span> Landlord has no knowledge of radon levels at the premises.<br/>
      <span class="checkbox"></span> Radon testing has been conducted. Results: _______________________
    </div>
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
    `);
  }
  
  // Flood zone disclosure
  if (disclosures.floodZone || data.floodZoneDisclosure) {
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>FLOOD ZONE DISCLOSURE</strong><br/><br/>
      <span class="checkbox"></span> The premises is NOT located in a designated flood zone.<br/>
      <span class="checkbox"></span> The premises IS located in a designated flood zone. Tenant is advised to obtain flood insurance.
    </div>
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
      <strong style="margin-left: 20pt;">Landlord Initials:</strong> <span class="initials-line"></span>
    </div>
    `);
  }
  
  // Sex offender registry notice
  if (disclosures.sexOffender) {
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>SEX OFFENDER REGISTRY NOTICE</strong><br/><br/>
      Pursuant to ${state} law, information about registered sex offenders may be obtained from local law enforcement 
      or by visiting the state's sex offender registry website. Landlord makes no representations regarding the presence 
      of registered sex offenders in the area.
    </div>
    <div class="initials-row">
      <strong>Tenant Initials:</strong> <span class="initials-line"></span>
    </div>
    `);
  }
  
  // ── New York free-market specific disclosures ─────────────────────────────
  if (state === 'NY') {
    // Bedbug disclosure — NY Real Property Law §227-e: must cover unit AND building for prior year
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>NEW YORK BED BUG DISCLOSURE — UNIT AND BUILDING HISTORY (Required by NY RPL §227-e)</strong><br/><br/>
      New York law requires the landlord to disclose the bedbug infestation history of the rental unit AND the entire building for the prior year.<br/><br/>
      <strong>UNIT History (prior 12 months):</strong><br/>
      <span class="checkbox"></span> There has been NO bed bug infestation in the rental unit in the prior year.<br/>
      <span class="checkbox"></span> There HAS been a bed bug infestation in the rental unit. The most recent infestation and eradication date(s): _______________________<br/><br/>
      <strong>BUILDING History (prior 12 months):</strong><br/>
      <span class="checkbox"></span> There has been NO bed bug infestation in the building in the prior year.<br/>
      <span class="checkbox"></span> There HAS been a bed bug infestation in the building. Floors/units affected and eradication date(s): _______________________<br/><br/>
      Tenant acknowledges receipt of this disclosure.<br/>
      Tenant Initials: <span class="initials-line"></span>&nbsp;&nbsp;&nbsp;&nbsp;Landlord Initials: <span class="initials-line"></span>
    </div>
    `);

    // Window guard notice — NYC Admin Code §17-123: required if children under 10 occupy or will occupy
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>NEW YORK WINDOW GUARD NOTICE (NYC Admin Code §17-123)</strong><br/><br/>
      New York City law requires the installation of window guards in apartments where children 10 years of age or younger reside, or where the tenant requests window guards.<br/><br/>
      <span class="checkbox"></span> <strong>YES</strong> — Children 10 years of age or younger live or will live in this apartment. Landlord is required to install window guards.<br/>
      <span class="checkbox"></span> <strong>NO</strong> — No children 10 years of age or younger live or will live in this apartment. However, Tenant may still request window guards.<br/><br/>
      <em>If children under 10 will be residing in this unit, Tenant must notify Landlord immediately. Landlord must install window guards within 30 days of request or at lease commencement, whichever is earlier.</em><br/><br/>
      Tenant Signature: <span class="initials-line" style="width:200px;"></span>&nbsp;&nbsp;&nbsp;Date: <span class="initials-line" style="width:100px;"></span>
    </div>
    `);

    // HSTPA 2019 — security deposit cap notice
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>NEW YORK SECURITY DEPOSIT NOTICE — HSTPA 2019 (NY RPL §702)</strong><br/><br/>
      Pursuant to the Housing Stability and Tenant Protection Act of 2019, the security deposit for this free-market residential unit is capped at <strong>ONE (1) month's rent</strong>. No additional deposits or prepaid rent above one month's rent may be collected.<br/><br/>
      Security Deposit Collected: $_______ (must not exceed one month's rent of ${data.monthlyRent ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.monthlyRent) : '_______'})<br/><br/>
      Deposit must be returned, with an itemized written statement of any deductions, within <strong>14 days</strong> after Tenant has vacated and surrendered possession.<br/><br/>
      Tenant Initials: <span class="initials-line"></span>&nbsp;&nbsp;&nbsp;&nbsp;Landlord Initials: <span class="initials-line"></span>
    </div>
    `);

    // Good Cause Eviction — NY RPL §231-b (enacted April 2024)
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>NEW YORK GOOD CAUSE EVICTION NOTICE (NY RPL §231-b, effective April 20, 2024)</strong><br/><br/>
      New York's Good Cause Eviction Law (Part BB of Chapter 56 of the Laws of 2024) provides protections for tenants in certain unregulated (free-market) residential units. Unless a specific exemption applies, a landlord may not evict a tenant or refuse to renew a lease without "good cause."<br/><br/>
      <strong>Common Good Cause grounds include:</strong> nonpayment of rent, material lease violations, use of the unit for illegal purposes, nuisance, certain owner-occupancy situations, and withdrawal of the unit from the market.<br/><br/>
      <strong>Rent increase protection:</strong> An unreasonable rent increase (generally more than 5% plus local CPI, capped at 10%) may be grounds for a tenant to contest non-renewal.<br/><br/>
      <strong>Exemptions — This law may NOT apply if:</strong><br/>
      <ul style="margin-top:6pt;">
        <li>The building contains fewer than 10 residential units (buildings with 4 or fewer units where the owner occupies one unit may be exempt);</li>
        <li>The unit was built after 2009 (for 30 years from first certificate of occupancy);</li>
        <li>The unit is a condo or co-op;</li>
        <li>The unit is subject to rent stabilization or rent control (different rules apply);</li>
        <li>Other statutory exemptions apply.</li>
      </ul>
      <br/>
      <em>Landlord and Tenant should consult with a licensed New York attorney to determine whether this law applies to this specific tenancy.</em><br/><br/>
      Tenant acknowledges receipt of this notice.<br/>
      Tenant Initials: <span class="initials-line"></span>&nbsp;&nbsp;&nbsp;&nbsp;Landlord Initials: <span class="initials-line"></span>
    </div>
    `);

    // Attorney's fees reciprocity notice — NY RPL §234
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>NEW YORK ATTORNEY'S FEES NOTICE (NY Real Property Law §234)</strong><br/><br/>
      New York Real Property Law §234 provides that if a lease contains an attorney's fees clause in favor of the landlord, the tenant has an automatic reciprocal right to recover attorney's fees if the tenant is the prevailing party in any action or proceeding arising out of the lease. Any clause in this lease providing for attorney's fees for Landlord is deemed to also apply in favor of Tenant.<br/><br/>
      Tenant Initials: <span class="initials-line"></span>&nbsp;&nbsp;&nbsp;&nbsp;Landlord Initials: <span class="initials-line"></span>
    </div>
    `);
  }

  // State-specific notes
  if (disclosures.notes && disclosures.notes.length > 0) {
    const notesList = disclosures.notes.map(note => '<li>' + note + '</li>').join('');
    sections.push(`
    <div class="legal-notice" style="margin-top: 16pt;">
      <strong>ADDITIONAL ${state} REQUIREMENTS</strong><br/><br/>
      <ul>
        ${notesList}
      </ul>
    </div>
    `);
  }
  
  sections.push('</div>');
  
  return sections.join('\n');
}


/**
 * Build lease data from property, unit, landlord, and tenant records
 */
export function buildLeaseDataFromRecords(params: {
  landlord: {
    name: string;
    companyName?: string | null;
    companyAddress?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    securityDepositMonths: number;
    petDepositEnabled?: boolean;
    petDepositAmount?: number | null;
    petRentEnabled?: boolean;
    petRentAmount?: number | null;
    cleaningFeeEnabled?: boolean;
    cleaningFeeAmount?: number | null;
  };
  property: {
    name: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    amenities?: string[];
  };
  unit: {
    name: string;
    type: string;
    rentAmount: number;
  };
  tenant: {
    name: string;
    email: string;
  };
  leaseTerms: {
    startDate: Date;
    endDate?: Date | null;
    isMonthToMonth?: boolean;
    billingDayOfMonth: number;
  };
  customizations?: Partial<LeaseBuilderData>;
}): LeaseBuilderData {
  const { landlord, property, unit, tenant, leaseTerms, customizations = {} } = params;
  
  const propertyAddress = [
    property.address.street,
    property.address.city,
    property.address.state,
    property.address.zipCode,
  ].filter(Boolean).join(', ');

  const securityDeposit = unit.rentAmount * landlord.securityDepositMonths;
  
  return {
    // Parties
    landlordLegalName: landlord.name,
    landlordCompanyName: landlord.companyName || undefined,
    landlordAddress: landlord.companyAddress || undefined,
    landlordEmail: landlord.companyEmail || undefined,
    landlordPhone: landlord.companyPhone || undefined,
    tenantNames: [tenant.name],
    tenantEmails: [tenant.email],
    
    // Property
    propertyAddress,
    unitNumber: unit.name,
    propertyDescription: `${unit.type} unit`,
    includedAreas: property.amenities?.filter(a => 
      ['garage', 'parking', 'storage', 'yard', 'patio', 'balcony'].some(k => a.toLowerCase().includes(k))
    ),
    
    // Lease Term
    leaseStartDate: leaseTerms.startDate,
    leaseEndDate: leaseTerms.endDate || undefined,
    isMonthToMonth: leaseTerms.isMonthToMonth || !leaseTerms.endDate,
    autoRenewal: true,
    renewalNoticeDays: LEASE_DEFAULTS.renewalNoticeDays,
    
    // Rent & Payment
    monthlyRent: unit.rentAmount,
    rentDueDay: leaseTerms.billingDayOfMonth,
    gracePeriodDays: LEASE_DEFAULTS.gracePeriodDays,
    acceptedPaymentMethods: LEASE_DEFAULTS.acceptedPaymentMethods,
    allowPartialPayments: false,
    
    // Late Fees
    lateFeePercent: 5,
    lateFeeStartDay: LEASE_DEFAULTS.lateFeeStartDay,
    
    // Security Deposit
    securityDepositAmount: securityDeposit,
    depositUseCases: LEASE_DEFAULTS.depositUseCases,
    depositReturnDays: LEASE_DEFAULTS.depositReturnDays,
    depositNotLastMonthRent: true,
    
    // Utilities
    tenantPaysUtilities: LEASE_DEFAULTS.tenantPaysUtilities,
    landlordPaysUtilities: LEASE_DEFAULTS.landlordPaysUtilities,
    
    // Pet Policy
    petsAllowed: landlord.petDepositEnabled || landlord.petRentEnabled || false,
    petDeposit: landlord.petDepositEnabled ? (landlord.petDepositAmount || 0) : undefined,
    petRent: landlord.petRentEnabled ? (landlord.petRentAmount || 0) : undefined,
    
    // Property Rules
    smokingAllowed: false,
    
    // Entry & Access
    entryNoticeDays: LEASE_DEFAULTS.entryNoticeDays,
    entryReasons: LEASE_DEFAULTS.entryReasons,
    
    // Insurance
    rentersInsuranceRequired: false,
    
    // Move-out
    moveOutNoticeDays: LEASE_DEFAULTS.moveOutNoticeDays,
    moveOutCleaningRequirements: LEASE_DEFAULTS.moveOutCleaningRequirements,
    
    // State
    state: property.address.state || 'NV',
    
    // Signing date
    signingDate: new Date(),
    
    // Apply any customizations
    ...customizations,
  };
}
