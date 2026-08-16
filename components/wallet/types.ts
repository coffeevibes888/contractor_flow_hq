/**
 * Re-exports of the wire shapes used by the wallet UI. Centralizing them
 * here keeps every component in this folder importing from one place
 * (rather than each one reaching into /api/wallet/* route files).
 */
export type { WalletBalanceResponse } from '@/app/api/wallet/balance/route';
export type {
  WalletTransactionRow,
  WalletTransactionsResponse,
  WalletTxFilter,
} from '@/app/api/wallet/transactions/route';
export type { WalletRecipientResult } from '@/app/api/wallet/recipients/search/route';
export type { WalletExternalAccount } from '@/app/api/wallet/external-accounts/route';
