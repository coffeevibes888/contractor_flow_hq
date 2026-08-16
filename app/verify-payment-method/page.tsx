import { Suspense } from 'react';
import { verifyPaymentMethod } from '@/lib/actions/user.actions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';

export const metadata = {
  title: 'Verify Payment Method',
};

async function VerifyContent({ token }: { token: string }) {
  const result = await verifyPaymentMethod(token);

  if (result.success) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Card className='w-full max-w-md p-8'>
          <div className='flex flex-col items-center text-center space-y-4'>
            <CheckCircle className='w-16 h-16 text-green-600' />
            <h1 className='text-2xl font-bold'>Payment Method Verified!</h1>
            <p className='text-gray-600'>
              Your payment method has been successfully verified and is now active on your account.
            </p>
            <Button asChild className='w-full mt-6'>
              <Link href='/user/profile'>Back to Profile</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center min-h-screen'>
      <Card className='w-full max-w-md p-8'>
        <div className='flex flex-col items-center text-center space-y-4'>
          <XCircle className='w-16 h-16 text-red-600' />
          <h1 className='text-2xl font-bold'>Verification Failed</h1>
          <p className='text-gray-600'>{result.message}</p>
          <Button asChild className='w-full mt-6'>
            <Link href='/user/profile'>Back to Profile</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default async function VerifyPaymentMethodPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Card className='w-full max-w-md p-8'>
          <div className='flex flex-col items-center text-center space-y-4'>
            <XCircle className='w-16 h-16 text-red-600' />
            <h1 className='text-2xl font-bold'>Invalid Request</h1>
            <p className='text-gray-600'>No verification token provided.</p>
            <Button asChild className='w-full mt-6'>
              <Link href='/user/profile'>Back to Profile</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Verifying...</div>}>
      <VerifyContent token={token} />
    </Suspense>
  );
}
