// Redirects legacy /admin/settings/subscription bookmark to the new canonical URL.
import { redirect } from 'next/navigation';
export default function LegacySubscriptionPage() {
  redirect('/admin/subscription');
}
