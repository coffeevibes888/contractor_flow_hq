import { redirect } from 'next/navigation';

export default function LegacyNewPropertyPage() {
  redirect('/admin/dashboard/properties/new');
}
