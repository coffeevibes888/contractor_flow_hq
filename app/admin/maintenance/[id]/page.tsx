import { redirect } from 'next/navigation';

interface AdminMaintenanceDetailPageProps {
  params: Promise<{ id: string }>;
}

// The old basic detail page — redirect permanently to the enhanced view
export default async function AdminMaintenanceDetailPage({ params }: AdminMaintenanceDetailPageProps) {
  const { id } = await params;
  redirect(`/admin/maintenance/${id}/enhanced`);
}
