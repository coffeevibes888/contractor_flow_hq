'use client';
import { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/lib/actions/user.actions';
import { updateProfileSchema } from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import PhoneVerification from './phone-verification';
import AvatarUpload from './avatar-upload';
import AddressForm from './address-form';
import StripeProvider from './stripe-provider';
import { Eye, EyeOff, Lock } from 'lucide-react';

const SavedPaymentMethods = lazy(() => import('./saved-payment-methods'));

const ProfileForm = () => {
  const { data: session, update } = useSession();
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
    },
  });

  const { toast } = useToast();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: 'destructive', description: 'New passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ variant: 'destructive', description: 'Password must be at least 8 characters' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/user/account-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', ...passwordForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast({ description: 'Password updated successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      toast({ variant: 'destructive', description: err instanceof Error ? err.message : 'Failed to update password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof updateProfileSchema>) => {
    const res = await updateProfile(values);

    if (!res.success) {
      return toast({
        variant: 'destructive',
        description: res.message,
      });
    }

    const newSession = {
      ...session,
      user: {
        ...session?.user,
        name: values.name,
      },
    };

    await update(newSession);

    toast({
      description: res.message,
    });
  };

  interface Address {
    fullName?: string;
    streetAddress?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  }

  const userAddress = session?.user?.address as Address | undefined;
  const userShippingAddress = session?.user?.shippingAddress as Address | undefined;
  const userBillingAddress = session?.user?.billingAddress as Address | undefined;

  return (
    <div className='space-y-8'>
      <div className='bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl p-8 shadow-lg'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-start'>
          <div className='flex flex-col items-center'>
            <h3 className='text-xl font-semibold text-white mb-6'>Avatar</h3>
            <AvatarUpload
              currentImage={session?.user?.image}
              userName={session?.user?.name}
            />
          </div>

          <div className='lg:col-span-2'>
            <h3 className='text-xl font-semibold text-slate-200 mb-6'>Basic Information</h3>
            <Form {...form}>
              <form
                className='space-y-6'
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className='space-y-4'>
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            disabled
                            placeholder='Email'
                            className='input-field bg-slate-900 border-white/5 text-slate-500 placeholder:text-slate-600'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder='Name'
                            className='input-field bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type='submit'
                  size='lg'
                  className='w-full bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 hover:from-indigo-500 hover:to-teal-500 text-white'
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Submitting...' : 'Update Profile'}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div className='bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl p-8 shadow-lg'>
          <h3 className='text-xl font-semibold text-white mb-6'>Addresses</h3>
          <AddressForm 
            initialAddress={userAddress}
            initialShippingAddress={userShippingAddress}
            initialBillingAddress={userBillingAddress}
          />
        </div>

        <div className='bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl p-8 shadow-lg'>
          <h3 className='text-xl font-semibold text-white mb-6'>Phone Number</h3>
          {session?.user?.phoneNumber ? (
            <div className='space-y-4'>
              <div className='p-4 bg-linear-to-r from-cyan-400 via-sky-200 to-cyan-500 border border-white/10 rounded-lg'>
                <p className='text-sm text-gray-300'>Phone Number on File</p>
                <p className='text-lg font-semibold text-white mt-2'>{session.user.phoneNumber}</p>
                {session?.user?.phoneVerified && (
                  <div className='flex items-center gap-2 mt-3'>
                    <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                    <p className='text-xs font-medium text-green-300'>Verified</p>
                  </div>
                )}
              </div>
              <div className='flex gap-3'>
                <Button
                  type='button'
                  variant='outline'
                  className='flex-1 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
                  onClick={() => setShowPhoneVerification(!showPhoneVerification)}
                >
                  {!session.user.phoneVerified ? 'Verify Number' : 'Update Number'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type='button'
              variant='outline'
              className='w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
              onClick={() => setShowPhoneVerification(!showPhoneVerification)}
            >
              {showPhoneVerification ? 'Cancel' : 'Add Phone Number'}
            </Button>
          )}

          {showPhoneVerification && (
            <div className='mt-6 p-4 bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-lg'>
              <PhoneVerification
                mode={session?.user?.phoneNumber ? 'verify' : 'add'}
                onPhoneVerified={() => {
                  setShowPhoneVerification(false);
                  window.location.reload();
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className='bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl p-8 shadow-lg'>
        <h3 className='text-xl font-semibold text-white mb-6 flex items-center gap-2'><Lock className='h-5 w-5' /> Change Password</h3>
        <div className='space-y-4'>
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => {
            const labels = { currentPassword: 'Current Password', newPassword: 'New Password', confirmPassword: 'Confirm New Password' };
            const showKey = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm';
            const show = showPasswords[showKey as keyof typeof showPasswords];
            return (
              <div key={field} className='relative'>
                <input
                  type={show ? 'text' : 'password'}
                  placeholder={labels[field]}
                  value={passwordForm[field]}
                  onChange={(e) => setPasswordForm(p => ({ ...p, [field]: e.target.value }))}
                  className='w-full bg-slate-800/60 border border-white/10 rounded-lg px-4 py-2.5 pr-12 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50'
                />
                <button
                  type='button'
                  onClick={() => setShowPasswords(p => ({ ...p, [showKey]: !p[showKey as keyof typeof p] }))}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300'
                >
                  {show ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            );
          })}
          <Button
            type='button'
            onClick={handleChangePassword}
            disabled={savingPassword}
            className='bg-cyan-600 hover:bg-cyan-500 text-white'
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </div>

      <div className='bg-linear-to-r from-cyan-700 to-cyan-700 border border-white/10 rounded-xl p-8 shadow-lg'>
        <h3 className='text-xl font-semibold text-white mb-6'>Payment Methods</h3>
        <Suspense fallback={
          <div className='text-center text-gray-400 py-8'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500'></div>
            <p className='mt-3 text-sm'>Loading payment methods...</p>
          </div>
        }>
          <StripeProvider>
            <SavedPaymentMethods />
          </StripeProvider>
        </Suspense>
      </div>
    </div>
  );
};

export default ProfileForm;



