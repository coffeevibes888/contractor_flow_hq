import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import SignOutButton from './sign-out-button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserIcon } from 'lucide-react';

const UserButton = async () => {
  const session = await auth();

  if (!session) {
    return (
      <div className='flex gap-2 items-center'>
        <Button asChild variant='outline'>
          <Link href='/sign-in'>
            Sign In
          </Link>
        </Button>
        <Button asChild>
          <Link href='/sign-up'>
            Sign Up
          </Link>
        </Button>
      </div>
    );
  }

  const firstInitial = session.user?.name?.charAt(0).toUpperCase() ?? 'U';
  const userImage = session.user?.image;

  return (
    <div className='flex gap-2 items-center'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className='flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 rounded-full'
          >
            {userImage ? (
              <div className='relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 ml-2 cursor-pointer bg-transparent'>
                <Image
                  src={userImage}
                  alt={session.user?.name || 'User avatar'}
                  fill
                  className='object-cover'
                  priority
                />
              </div>
            ) : (
              <span
                className='w-8 h-8 rounded-full ml-2 flex items-center justify-center bg-gray-200 border border-gray-400 text-black font-bold text-sm cursor-pointer'
              >
                {firstInitial}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <div className='text-sm font-medium leading-none'>
                {session.user?.name}
              </div>
              <div className='text-sm text-muted-foreground leading-none'>
                {session.user?.email}
              </div>
            </div>
          </DropdownMenuLabel>

          {session.user?.role === 'superAdmin' && (
            <>
              <DropdownMenuItem asChild>
                <Link href='/super-admin' className='text-black font-semibold hover:bg-gray-800 hover:text-white'>Owner</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/dispute-center' className='text-black font-semibold hover:bg-gray-800 hover:text-white'>⚖️ Dispute Center</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/admin/blog/create' className='text-black font-semibold hover:bg-gray-800 hover:text-white'>Create Blog</Link>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild className='p-0 mb-1'>
            <SignOutButton />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserButton;
