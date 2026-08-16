import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ExpenseForm } from '@/components/contractor/expense-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Log Expense',
};

export default async function NewExpensePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
    businessName: true,
  });

  if (!contractorProfile) {
    redirect('/onboarding/contractor');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/contractor-dashboard/expenses"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-blue-600">Log Expense</h1>
          <p className="text-sm text-gray-600 mt-1">
            Record a new business expense
          </p>
        </div>
      </div>

      {/* Form */}
      <ExpenseForm mode="create" />
    </div>
  );
}
