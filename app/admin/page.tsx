import { redirect } from 'next/navigation';

/**
 * Bare `/admin` has no dashboard of its own — the dashboard lives at
 * `/admin/overview`. Several pages also `redirect('/admin')` as an
 * unauthorized/no-landlord fallback, so this guarantees that always lands
 * somewhere real instead of a 404.
 */
export default function AdminIndexPage() {
  redirect('/admin/overview');
}
