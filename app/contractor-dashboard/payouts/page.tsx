import { redirect } from 'next/navigation';

/**
 * Legacy /contractor-dashboard/payouts URL — Wallet now consolidates the
 * Cash Out flow, earnings KPIs, payment history, and Stripe Connect setup
 * banner. Forward all visits (and `?onboarding=complete` returns) to the
 * new wallet page.
 */
export default async function LegacyContractorPayoutsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') qs.set(k, v);
    else if (Array.isArray(v) && v[0]) qs.set(k, v[0]);
  }
  const tail = qs.toString();
  redirect(tail ? `/contractor-dashboard/wallet?${tail}` : '/contractor-dashboard/wallet');
}
