import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import Link from 'next/link';
import Menu from '@/components/shared/header/menu';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import SuperAdminTopNav from './super-admin-top-nav';
import React from 'react';

export default function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProviderWrapper>
      <div className='flex flex-col min-h-screen bg-blue-700 text-slate-50 overflow-x-hidden'>
        <div className='border-b border-white/10 bg-blue-800/80 backdrop-blur w-full'>
          <div className='flex items-center h-16 px-4 max-w-7xl mx-auto w-full gap-3'>
            <Link
              href='/'
              className='flex items-center gap-2 min-w-0 flex-shrink-0'
              aria-label='Home'
            >
              <Image
                src='/images/logo.svg'
                height={40}
                width={40}
                alt={APP_NAME}
                className='h-10 w-10'
              />
              <span className='hidden sm:inline text-sm font-semibold tracking-wide uppercase text-white whitespace-nowrap'>
                Super Admin
              </span>
            </Link>

            {/* Responsive nav — collapses to hamburger on small screens */}
            <SuperAdminTopNav />

            <div className='ml-auto flex items-center gap-2 flex-shrink-0'>
              <Menu />
            </div>
          </div>
        </div>

        <div className='flex-1 min-w-0'>{children}</div>
      </div>
    </SessionProviderWrapper>
  );
}
