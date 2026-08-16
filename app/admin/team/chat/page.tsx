import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Team Chat',
};

export default async function TeamChatPage() {
  await requireAdmin();

  redirect('/admin/team');
}
