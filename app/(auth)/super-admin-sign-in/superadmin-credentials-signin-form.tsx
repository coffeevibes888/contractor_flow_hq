'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signInWithCredentials } from '@/lib/actions/user.actions';

const DEFAULT_SUPERADMIN_EMAIL = 'earthschoolwithgod777@outlook.com';

const SuperAdminCredentialsSignInForm = () => {
  const [data, action] = useActionState(signInWithCredentials, {
    success: false,
    message: '',
  });

  const SignInButton = () => {
    const { pending } = useFormStatus();

    return (
      <Button type='submit' disabled={pending} className='w-full' variant='default'>
        {pending ? 'Signing In...' : 'Sign In as Super Admin'}
      </Button>
    );
  };

  return (
    <form action={action} autoComplete='off'>
      <input type='hidden' name='callbackUrl' value='/super-admin' />
      <div className='space-y-6'>
        <div>
          <Label htmlFor='email'>SuperAdmin Email</Label>
          <Input
            id='email'
            name='email'
            type='email'
            required
            autoComplete='off'
            defaultValue={DEFAULT_SUPERADMIN_EMAIL}
            className='bg-white text-gray-900 border-gray-300'
          />
        </div>
        <div>
          <Label htmlFor='password'>Password (min 15 characters)</Label>
          <Input
            id='password'
            name='password'
            type='password'
            required
            minLength={15}
            autoComplete='new-password'
            className='bg-white text-gray-900 border-gray-300'
          />
        </div>
        <div>
          <SignInButton />
        </div>

        {data && !data.success && (
          <div className='text-center text-destructive text-sm'>{data.message}</div>
        )}
      </div>
    </form>
  );
};

export default SuperAdminCredentialsSignInForm;
