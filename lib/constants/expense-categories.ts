/**
 * Expense category options used by the receipt + expense flows.
 *
 * Lives in its own module so it can be imported from client components.
 * Previously this was exported from `lib/actions/document.actions.ts`,
 * but that file uses `'use server'`, and Next's server-action loader
 * collapses non-function exports from such files to `undefined` on the
 * client — which crashed the receipt dialog with "page can't load" when
 * it tried to `.map()` over the categories.
 */

export interface ExpenseCategory {
  value: string;
  label: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Property Taxes' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'legal', label: 'Legal & Professional' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'management', label: 'Property Management' },
  { value: 'other', label: 'Other' },
];
