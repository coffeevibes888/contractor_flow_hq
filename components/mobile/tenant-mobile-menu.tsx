'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TenantMobileMenuProps {
  children: React.ReactNode;
}

export default function TenantMobileMenu({ children }: TenantMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <Button
        variant='ghost'
        size='sm'
        className='md:hidden h-9 w-9 p-0 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 shadow-sm'
        onClick={toggleMenu}
        aria-label='Open navigation menu'
      >
        {isOpen ? <X className='h-4 w-4' /> : <Menu className='h-4 w-4' />}
      </Button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className='admin-overlay show md:hidden'
          onClick={closeMenu}
        />
      )}

      {/* Slide-in sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] max-w-[85vw] bg-white border-r border-slate-200 shadow-xl z-[60] transition-transform duration-300 ease-in-out overflow-y-auto md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className='p-4'>
          <div className='flex items-center justify-between mb-4 pt-1'>
            <div>
              <p className='text-sm font-bold text-black'>Resident Portal</p>
              <p className='text-xs text-slate-500'>Profile & Rentals</p>
            </div>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0 text-slate-500 hover:text-black hover:bg-slate-100'
              onClick={closeMenu}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
          <div className='border-t border-slate-100 pt-3' onClick={closeMenu}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
