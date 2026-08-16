import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import StripeProvider from '@/app/user/profile/stripe-provider';
import HomeownerPaymentMethodsClient from './payment-methods-client';

export const metadata: Metadata = {
  title: 'Payment Methods',
};

export default async function HomeownerPaymentMethodsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'homeowner') {
    return redirect('/');
  }

  return (
    <StripeProvider>
      <HomeownerPaymentMethodsClient />
    </StripeProvider>
  );
}
