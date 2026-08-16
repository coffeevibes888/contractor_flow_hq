import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PayoutsConnectButton from '@/components/admin/payouts-connect-button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function PayoutsSetupPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  if (session.user.role !== 'landlord') {
    return redirect('/');
  }

  return (
    <div className="container max-w-4xl py-8">
      <Link 
        href="/admin/payouts" 
        className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Payouts
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Set Up Payouts</h1>
          <p className="text-slate-600 mt-2">
            Connect your bank account to receive rent payments directly
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stripe Connect Onboarding</CardTitle>
            <CardDescription>
              Complete the secure verification process to start receiving payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayoutsConnectButton 
              component="account_onboarding"
              onComplete={() => {
                window.location.href = '/admin/payouts?setup=complete';
              }}
            />
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">What you'll need:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Business or personal information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Bank account details for payouts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Tax identification number (SSN or EIN)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>5-10 minutes to complete the process</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
