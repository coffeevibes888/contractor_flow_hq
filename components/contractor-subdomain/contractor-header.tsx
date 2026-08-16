'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ContractorQuoteButton } from '@/components/contractor/quote-button';

interface ContractorSubdomainHeaderProps {
  contractor: {
    id: string;
    businessName: string;
    displayName: string;
    subdomain: string | null;
    logoUrl?: string | null;
    email: string;
    phone?: string | null;
    themeColor?: string | null;
    slug: string;
  };
  /** When true, uses root path /[subdomain] instead of /c/[subdomain] */
  useRootPath?: boolean;
}

export default function ContractorSubdomainHeader({ contractor, useRootPath = false }: ContractorSubdomainHeaderProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const accent = (() => {
    switch (contractor.themeColor) {
      case 'emerald':
        return 'text-emerald-300 border-emerald-400/40';
      case 'blue':
        return 'text-cyan-300 border-cyan-400/40';
      case 'rose':
        return 'text-rose-300 border-rose-400/40';
      case 'amber':
        return 'text-amber-300 border-amber-400/40';
      default:
        return 'text-violet-300 border-violet-400/40';
    }
  })();

  const brandName = contractor.businessName;
  // Use root path for unified subdomain routing, or /c/ path for legacy
  const subdomainPath = contractor.subdomain || contractor.slug;
  const basePath = useRootPath ? `/${subdomainPath}` : `/c/${contractor.subdomain}`;

  return (
    <header className="w-full bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-600 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Logo and Company Name */}
          <Link href={basePath} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {contractor.logoUrl ? (
              <div className="relative h-12 w-12 md:h-16 md:w-16">
                <Image
                  src={contractor.logoUrl}
                  alt={`${brandName} logo`}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className={`h-12 w-12 md:h-16 md:w-16 rounded-lg bg-white/5 flex items-center justify-center border ${accent}`}>
                <span className="text-2xl font-bold text-violet-300">
                  {brandName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-bold text-white">{brandName}</h1>
              <p className="text-xs text-slate-300/80">Professional Contractor</p>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-200/90">
            <Link href={basePath} className="hover:text-violet-200 transition-colors">
              Home
            </Link>
            <Link href={`${basePath}/contact`} className="hover:text-violet-200 transition-colors">
              Contact
            </Link>
          </nav>

          {/* Contact Info */}
          <div className="flex items-center gap-4 md:gap-6">
            {contractor.phone && (
              <a
                href={`tel:${contractor.phone}`}
                className="hidden md:flex items-center gap-2 text-sm text-slate-200 hover:text-violet-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{contractor.phone}</span>
              </a>
            )}
            {contractor.email && (
              <a
                href={`mailto:${contractor.email}`}
                className="hidden md:flex items-center gap-2 text-sm text-slate-200 hover:text-violet-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{contractor.email}</span>
              </a>
            )}
            <div className="hidden sm:block">
              <ContractorQuoteButton
                contractorSlug={contractor.slug}
                contractorName={brandName}
                variant="header"
              />
            </div>
            <button
              className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-white/10 text-white hover:border-violet-400/60 transition-colors"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {open && (
          <div className="md:hidden mt-3 space-y-2 text-sm font-medium text-slate-200/90">
            <Link href={basePath} className="block px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              Home
            </Link>
            <Link href={`${basePath}/contact`} className="block px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              Contact
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
