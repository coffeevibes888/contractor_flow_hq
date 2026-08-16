import { prisma } from '@/db/prisma';
import SubdomainHeader from '@/components/subdomain/subdomain-header';
import ContractorSubdomainHeader from '@/components/contractor-subdomain/contractor-header';
import RootHeader from '@/components/shared/header';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import { auth } from '@/auth';
import { detectSubdomainEntity } from '@/lib/utils/subdomain-detection';

export default async function SubdomainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  // Check the current path so we can hide chrome on full-screen flows
  // (the rental application wizard) and use a different header on the new
  // single-page property detail view.
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isApplicationPage = pathname.includes('/application');
  // The PM property detail page is the new "Zillow/Redfin" single-page
  // experience. It uses the global root site header instead of the
  // subdomain mini-nav, since About/Contact have been folded into it.
  // The landlord home / portal root uses the same treatment so the
  // visitor journey from "Visit" button → home → property is consistent.
  const isPropertyDetail = /\/properties\/[^/]+/.test(pathname);
  const isSubdomainRoot = pathname === `/${subdomain}` || pathname === `/${subdomain}/`;
  
  // Detect whether this subdomain belongs to a landlord or contractor
  const entity = await detectSubdomainEntity(subdomain);
  
  if (entity.type === 'not_found') {
    notFound();
  }

  const session = await auth();

  // True when we want the new white admin-themed shell (root nav + slate-50
  // background) instead of the legacy tinted public-portal layout.
  const useNewLandlordShell =
    entity.type === 'landlord' && (isPropertyDetail || isSubdomainRoot);

  // Render appropriate header based on entity type
  const renderHeader = () => {
    if (isApplicationPage) return null;

    if (entity.type === 'landlord') {
      // On the new single-page property detail view (and the landlord's
      // home portal) we drop the subdomain mini-nav and use the global
      // root header so the user sees the same navigation as the rest of
      // the site.
      if (useNewLandlordShell) return <RootHeader />;
      return <SubdomainHeader landlord={entity.data} />;
    }
    
    if (entity.type === 'contractor') {
      // Map contractor data to header props
      return (
        <ContractorSubdomainHeader
          contractor={{
            id: entity.data.id,
            businessName: entity.data.businessName,
            displayName: entity.data.displayName,
            subdomain: entity.data.subdomain,
            logoUrl: entity.data.logoUrl,
            email: entity.data.email,
            phone: entity.data.phone,
            themeColor: entity.data.themeColor,
            slug: entity.data.slug,
          }}
          useRootPath={true}
        />
      );
    }
    
    return null;
  };

  // Property detail and the landlord home portal use the white admin
  // theme; everything else keeps the existing tinted public-portal
  // background.
  const wrapperClass = useNewLandlordShell
    ? 'min-h-screen bg-slate-50 text-slate-900'
    : 'min-h-screen bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-600 text-black';

  return (
    <SessionProviderWrapper>
      <div className={wrapperClass}>
        {renderHeader()}
        {children}
      </div>
    </SessionProviderWrapper>
  );
}
