/**
 * Chart of Accounts — Standard property-management template
 *
 * Seeded for every landlord the first time they opt in to the GL.
 * Aligned with the IRS Schedule E (Form 1040) categories so a future
 * 1099 / Schedule E export drops the right numbers in the right boxes.
 *
 *   1000–1999  Assets
 *   2000–2999  Liabilities
 *   3000–3999  Equity
 *   4000–4999  Income
 *   5000–5999  Expenses
 *
 * The accounts here are the system template. When a landlord opts in
 * (`ensureChartOfAccounts` in gl.ts) we copy these into a landlord-scoped
 * `ChartOfAccount` row with `isSystem = true` and `landlordId` set.
 */

import type { AccountType } from '@prisma/client';

export interface ChartOfAccountTemplate {
  code: string;
  name: string;
  type: AccountType;
  subType: string;
  /** IRS Schedule E line number, if applicable. */
  taxLine?: string;
  description?: string;
}

export const STANDARD_CHART_OF_ACCOUNTS: ChartOfAccountTemplate[] = [
  // ─── 1000s ASSETS ─────────────────────────────────────────────────────
  { code: '1000', name: 'Cash',                  type: 'asset',     subType: 'current_asset',  description: 'Master cash account — bank sweep' },
  { code: '1100', name: 'Cash — Operating',      type: 'asset',     subType: 'current_asset',  description: 'Day-to-day rent deposits' },
  { code: '1110', name: 'Cash — Security Deposits', type: 'asset',  subType: 'current_asset',  description: 'Trust account — tenant deposits (held in trust)' },
  { code: '1120', name: 'Cash — Owner Funds',    type: 'asset',     subType: 'current_asset',  description: 'Owners\' operating reserves' },
  { code: '1200', name: 'Accounts Receivable — Tenants', type: 'asset', subType: 'current_asset', description: 'Outstanding rent owed by tenants' },
  { code: '1210', name: 'Allowance for Doubtful Accounts', type: 'asset', subType: 'contra_asset', description: 'Estimated uncollectable rent' },
  { code: '1300', name: 'Prepaid Insurance',     type: 'asset',     subType: 'current_asset',  description: 'Insurance paid in advance' },
  { code: '1400', name: 'Property — Buildings',  type: 'asset',     subType: 'fixed_asset',    taxLine: 'sch_e_1a', description: 'Real estate — buildings (cost basis)' },
  { code: '1410', name: 'Property — Land',       type: 'asset',     subType: 'fixed_asset',    taxLine: 'sch_e_1b', description: 'Real estate — land (cost basis)' },
  { code: '1420', name: 'Accumulated Depreciation — Buildings', type: 'asset', subType: 'accumulated_depreciation', taxLine: 'sch_e_20', description: 'Total depreciation taken to date' },

  // ─── 2000s LIABILITIES ────────────────────────────────────────────────
  { code: '2000', name: 'Accounts Payable',      type: 'liability', subType: 'current_liability' },
  { code: '2100', name: 'Security Deposits Liability', type: 'liability', subType: 'current_liability', description: 'Tenant deposits held — offset 1110' },
  { code: '2110', name: 'Prepaid Rent',          type: 'liability', subType: 'current_liability', description: 'Rent collected before the period it covers' },
  { code: '2200', name: 'Owner Payable',         type: 'liability', subType: 'current_liability', description: 'Distributions owed to property owners' },
  { code: '2300', name: 'Wages Payable',         type: 'liability', subType: 'current_liability' },
  { code: '2400', name: 'Mortgage Payable',      type: 'liability', subType: 'long_term_liability', taxLine: 'sch_e_22' },
  { code: '2500', name: 'Property Tax Payable',  type: 'liability', subType: 'current_liability' },

  // ─── 3000s EQUITY ─────────────────────────────────────────────────────
  { code: '3000', name: 'Owner\'s Equity',       type: 'equity',    subType: 'owners_equity',  description: 'Cumulative owner capital' },
  { code: '3100', name: 'Retained Earnings',     type: 'equity',    subType: 'retained_earnings' },
  { code: '3900', name: 'Opening Balance Equity',type: 'equity',    subType: 'opening_balance',description: 'Backfill / opening balances when GL is enabled' },

  // ─── 4000s INCOME ─────────────────────────────────────────────────────
  { code: '4000', name: 'Rental Income',         type: 'income',    subType: 'rental_income',  taxLine: 'sch_e_3',  description: 'Base monthly rent' },
  { code: '4010', name: 'Late Fee Income',       type: 'income',    subType: 'fee_income' },
  { code: '4020', name: 'Application Fee Income',type: 'income',    subType: 'fee_income' },
  { code: '4030', name: 'Pet Rent',              type: 'income',    subType: 'rental_income' },
  { code: '4040', name: 'Parking Income',        type: 'income',    subType: 'rental_income' },
  { code: '4050', name: 'Laundry / Vending Income', type: 'income', subType: 'other_income' },
  { code: '4060', name: 'Storage Income',        type: 'income',    subType: 'rental_income' },
  { code: '4090', name: 'Other Income',          type: 'income',    subType: 'other_income',   taxLine: 'sch_e_4' },
  { code: '4900', name: 'Management Fee Income', type: 'income',    subType: 'fee_income',     description: 'When landlord is also the PM' },

  // ─── 5000s EXPENSES ───────────────────────────────────────────────────
  { code: '5000', name: 'Advertising',          type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_8' },
  { code: '5100', name: 'Repairs & Maintenance',type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_14' },
  { code: '5110', name: 'Cleaning & Janitorial', type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_14' },
  { code: '5120', name: 'Pest Control',          type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_14' },
  { code: '5130', name: 'Landscaping & Grounds', type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_14' },
  { code: '5200', name: 'Utilities',             type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_17' },
  { code: '5210', name: 'Water & Sewer',         type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_17' },
  { code: '5220', name: 'Electricity',           type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_17' },
  { code: '5230', name: 'Gas',                   type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_17' },
  { code: '5240', name: 'Internet / Cable',      type: 'expense',   subType: 'operating_expense' },
  { code: '5300', name: 'Insurance',             type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_9' },
  { code: '5400', name: 'Property Taxes',        type: 'expense',   subType: 'tax_expense',     taxLine: 'sch_e_16' },
  { code: '5500', name: 'Management Fees',       type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_10' },
  { code: '5600', name: 'Professional Fees',     type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_18' },
  { code: '5610', name: 'Legal Fees',            type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_18' },
  { code: '5620', name: 'Accounting Fees',       type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_18' },
  { code: '5700', name: 'Office & Administrative', type: 'expense', subType: 'operating_expense', taxLine: 'sch_e_19' },
  { code: '5710', name: 'Software & Subscriptions', type: 'expense', subType: 'operating_expense', taxLine: 'sch_e_19' },
  { code: '5720', name: 'Travel',                type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_19a' },
  { code: '5800', name: 'Owner Distribution',    type: 'expense',   subType: 'distribution',   description: 'Net income distributed to owners' },
  { code: '5900', name: 'Depreciation Expense',  type: 'expense',   subType: 'non_cash_expense', taxLine: 'sch_e_20' },
  { code: '5910', name: 'Mortgage Interest',     type: 'expense',   subType: 'financing',      taxLine: 'sch_e_12' },
  { code: '5920', name: 'Other Interest',        type: 'expense',   subType: 'financing' },
  { code: '5990', name: 'Other Expense',         type: 'expense',   subType: 'operating_expense', taxLine: 'sch_e_19' },
];

/** Look up the system template account code for a legacy `Expense.category` string. */
export function mapExpenseCategoryToAccountCode(category: string): string {
  if (!category) return '5990';
  const c = category.toLowerCase();
  if (c.includes('maintenance') || c.includes('repair')) return '5100';
  if (c.includes('clean') || c.includes('janitor'))     return '5110';
  if (c.includes('pest'))                                return '5120';
  if (c.includes('landscap') || c.includes('lawn'))      return '5130';
  if (c.includes('utilit') || c.includes('electric') || c.includes('water') || c.includes('gas')) return '5200';
  if (c.includes('insurance'))                           return '5300';
  if (c.includes('tax'))                                 return '5400';
  if (c.includes('management') || c.includes('platform_fee') || c.includes('platform fee')) return '5500';
  if (c.includes('legal') || c.includes('attorney'))    return '5610';
  if (c.includes('accounting') || c.includes('cpa'))     return '5620';
  if (c.includes('advertis') || c.includes('marketing')) return '5000';
  if (c.includes('office') || c.includes('supplies'))    return '5700';
  if (c.includes('software') || c.includes('subscription')) return '5710';
  if (c.includes('travel') || c.includes('mileage'))     return '5720';
  if (c.includes('vacancy_loss') || c.includes('vacancy loss')) return '5990';
  if (c.includes('owner_paid_utilities') || c.includes('owner paid utilities')) return '5200';
  if (c.includes('one_time_repairs') || c.includes('one-time repairs')) return '5100';
  if (c.includes('recurring_expenses') || c.includes('recurring expenses')) return '5700';
  return '5990';
}

/** Default cash account code (for the DR side of most receipts). */
export const DEFAULT_CASH_ACCOUNT_CODE = '1100';

/** Default AR account code (for the CR side when we recognize income but don't have cash). */
export const DEFAULT_AR_ACCOUNT_CODE = '1200';

/** Default rent income account code. */
export const DEFAULT_RENT_INCOME_ACCOUNT_CODE = '4000';

/** Default late fee account code. */
export const DEFAULT_LATE_FEE_INCOME_ACCOUNT_CODE = '4010';

/** Default security deposit liability. */
export const DEFAULT_SECURITY_DEPOSIT_LIABILITY_CODE = '2100';

/** Default security deposit cash (held in trust). */
export const DEFAULT_SECURITY_DEPOSIT_CASH_CODE = '1110';
