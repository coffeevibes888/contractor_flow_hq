import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SuperAdminCredentialsSignInForm from './superadmin-credentials-signin-form';

export const metadata: Metadata = {
  title: 'Super Admin Sign In',
};

const SuperAdminSignInPage = async () => {
  const session = await auth();

  // If already a superAdmin, go straight to the dashboard
  if (session && session.user.role === 'superAdmin') {
    return redirect('/super-admin');
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <Link href='/' className='flex-center'>
            <Image
              src='/images/logo.svg'
              width={100}
              height={100}
              alt={`${APP_NAME} logo`}
              priority={true}
            />
          </Link>
          <CardTitle className='text-center'>Super Admin Sign In</CardTitle>
          <CardDescription className='text-center text-xs'>
            Restricted access. Use your superAdmin credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <SuperAdminCredentialsSignInForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminSignInPage;
