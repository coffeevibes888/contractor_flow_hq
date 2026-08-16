import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import PortfolioForm from './portfolio-form';

export default async function NewPortfolioItemPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');
  if (session.user.role !== 'contractor') redirect('/');

  return <PortfolioForm />;
}
