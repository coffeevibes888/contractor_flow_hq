import { requireAdmin } from '@/lib/auth-guard';
import EvictionsClient from './_evictions-client';

export default async function EvictionsPage() {
  await requireAdmin();
  return <EvictionsClient />;
}

