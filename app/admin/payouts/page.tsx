import { redirect } from 'next/navigation';

/**
 * Legacy /admin/payouts URL — Wallet now consolidates rent collection,
 * KPIs, history, and Connect onboarding. Forward any deep link (including
 * `?onboarding=complete` from Stripe return URLs) to the new home.
 */
export default async function LegacyPayoutsRedirect({
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
  redirect(tail ? `/admin/wallet?${tail}` : '/admin/wallet');
}
