'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';

const links = [
  { href: '/super-admin', label: 'Dashboard', emoji: '🏠' },
  { href: '/super-admin/insights', label: 'Insights', emoji: '⚡' },
  { href: '/super-admin/writing-studio', label: 'Writing Studio', emoji: '✍️' },
  { href: '/super-admin/resume-builder', label: 'Resume Builder', emoji: '📄' },
  { href: '/super-admin/audit-logs', label: 'Audit Logs', emoji: '🔒' },
  { href: '/super-admin/newsletter', label: 'Signups', emoji: '📧' },
  { href: '/super-admin/security', label: 'Security', emoji: '🛡️' },
  { href: '/super-admin/testing', label: 'Testing', emoji: '🧪' },
  { href: '/super-admin/analytics', label: 'Analytics', emoji: '📊' },
  { href: '/super-admin/lease-leads', label: 'Lease Leads', emoji: '🌱' },
];

/**
 * Responsive top nav for super admin pages. On large screens it renders a
 * horizontal list; below that it collapses to a hamburger that opens a
 * slide-down sheet — this fixes the "huge blank space on the right" on phones
 * where the old layout always rendered all 9 links inline.
 */
export default function SuperAdminTopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Desktop inline nav — hidden on phones/tablets */}
      <nav className='hidden xl:flex items-center gap-4 min-w-0 overflow-x-auto'>
        {links.map((l) => {
          const isActive =
            l.href === '/super-admin'
              ? pathname === '/super-admin'
              : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm whitespace-nowrap transition-colors font-medium ${
                isActive ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <span className='mr-1' aria-hidden>
                {l.emoji}
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Hamburger — visible below xl */}
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='xl:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-white'
        aria-label='Open navigation'
        aria-expanded={open}
        aria-controls='super-admin-mobile-nav'
      >
        <MenuIcon className='h-5 w-5' />
      </button>

      {/* Mobile sheet */}
      {open && (
        <div
          id='super-admin-mobile-nav'
          role='dialog'
          aria-modal='true'
          aria-label='Super admin navigation'
          className='xl:hidden fixed inset-0 z-[60]'
        >
          <div
            className='absolute inset-0 bg-black/60'
            onClick={() => setOpen(false)}
          />
          <div className='absolute top-0 right-0 h-full w-[85vw] max-w-sm bg-blue-900 shadow-2xl flex flex-col'>
            <div className='flex items-center justify-between px-4 h-16 border-b border-white/10'>
              <span className='text-sm font-semibold uppercase tracking-wide text-white'>
                Super Admin
              </span>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='h-10 w-10 inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white'
                aria-label='Close navigation'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <nav className='flex-1 overflow-y-auto px-2 py-3 space-y-1'>
              {links.map((l) => {
                const isActive =
                  l.href === '/super-admin'
                    ? pathname === '/super-admin'
                    : pathname?.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span aria-hidden className='text-base'>
                      {l.emoji}
                    </span>
                    <span>{l.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
