import { Metadata } from 'next';
import { auth } from '@/auth';
import { SessionProvider } from 'next-auth/react';
import ProfileForm from './profile-form';

export const metadata: Metadata = {
  title: 'Customer Profile',
};

const Profile = async () => {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div className='w-full min-h-screen px-4 py-8 md:px-8'>
        <div className='max-w-7xl mx-auto space-y-8'>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
              <div>
                <h1 className='text-3xl md:text-4xl font-bold text-black mb-2'>Profile Settings</h1>
                <p className='text-slate-900'>Manage your account information and preferences</p>
              </div>
              {/* <Link
                href='/user/maintenance/create'
                className='inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-sm px-4 py-2 hover:bg-slate-800 transition-colors'
              >
                Create ticket
              </Link> */}
            </div>
          </div>
          <ProfileForm />
        </div>
      </div>
    </SessionProvider>
  );
};

export default Profile;
