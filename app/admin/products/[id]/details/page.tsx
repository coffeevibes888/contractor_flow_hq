import { redirect } from 'next/navigation';

export default async function LegacyPropertyDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/admin/dashboard/properties/${id}/details`);
}
