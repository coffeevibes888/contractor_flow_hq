import { redirect } from 'next/navigation';

export default function LegacyProductsPage(props: {
  searchParams: Promise<{ page?: string; query?: string }>;
}) {
  // Permanently moved to /admin/dashboard/properties
  redirect('/admin/dashboard/properties');
}
