import Image from "next/image";
import Link from "next/link";
import Menu from "./menu";
import AdminMobileDrawer from '@/components/admin/admin-mobile-drawer';
import ContractorMobileDrawer from '@/components/contractor/contractor-mobile-drawer';
import AgentMobileDrawer from '@/components/agent/agent-mobile-drawer';
import TenantMobileMenu from '@/components/mobile/tenant-mobile-menu';
import HomeownerMobileDrawer from '@/components/homeowner/homeowner-mobile-drawer';
import MainNav from '@/app/user/main-nav';
// import { getCategoryTree } from '@/lib/actions/product.actions';
import { prisma } from '@/db/prisma';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { ChevronDown } from 'lucide-react';

async function getLandlordForRequest() {
  const headersList = await headers();
  const landlordSlug = headersList.get('x-landlord-slug');
  if (!landlordSlug) return null;
  const landlord = await prisma.landlord.findUnique({ where: { subdomain: landlordSlug } });
  return landlord;
}

const Header = async () => {
  // const categories = await getCategoryTree(); // PM feature - disabled for ContractorFlowHQ
  const landlord = await getLandlordForRequest();
  const displayName = landlord?.name || 'Contractor Flow HQ';
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);
  const userRole = session?.user?.role;

  return ( 
    <header className="w-full text-black font-semibold">
      <div className="wrapper flex items-center justify-between md:hidden h-20 relative overflow-visible">
        {isAuthenticated && (
          <div className="flex items-center relative z-10">
            {userRole === 'contractor' ? (
              <ContractorMobileDrawer />
            ) : userRole === 'agent' ? (
              <AgentMobileDrawer />
            ) : (userRole === 'landlord' || userRole === 'admin' || userRole === 'superAdmin' || userRole === 'property_manager') ? (
              <AdminMobileDrawer />
            ) : userRole === 'homeowner' ? (
              <HomeownerMobileDrawer />
            ) : userRole === 'tenant' ? (
              <TenantMobileMenu>
                <MainNav />
              </TenantMobileMenu>
            ) : null}
          </div>
        )}

        {/* Logo — pointer-events contained to header height only */}
        <Link href='/' className="absolute left-1/2 transform -translate-x-1/2 top-0 h-full flex items-center justify-center z-[5]">
          <div className="relative w-48 h-10">
            <Image
              src={landlord?.logoUrl || '/images/logo.svg'}
              fill
              className="object-contain"
              alt={`${displayName} Logo`}
              priority={true}
            />
          </div>
        </Link>

        <div className="flex items-center relative z-10">
          <Menu />
        </div>
      </div>

      <div className="wrapper hidden md:flex items-center h-16 overflow-visible">
        {/* Logo - fixed width sized to logo's true 6:1 aspect ratio so it doesn't bleed into nav */}
        <div className="w-48 lg:w-56 flex-shrink-0">
          <Link href='/' className="flex items-center">
            <div className="relative w-full h-10">
              <Image
                src={landlord?.logoUrl || '/images/logo.svg'}
                fill
                className="object-contain object-left"
                alt={`${displayName} Logo`}
                priority={true}
              />
            </div>
          </Link>
        </div>

        {/* Centered Nav Links */}
        <div className="flex-1 flex items-center justify-center gap-1 text-sm font-medium">
          <Link href='/' className="px-2.5 py-1.5 text-black hover:underline">Home</Link>
          <Link href='/sign-up?role=contractor' className="px-2.5 py-1.5 text-rose-600 font-semibold hover:underline whitespace-nowrap">
            Start Free Trial
          </Link>

          {/* Resources Dropdown */}
          <div className="relative group">
            <button className="px-2.5 py-1.5 text-black hover:underline flex items-center gap-1" aria-label="Resources menu" aria-haspopup="true">
              Resources
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50 min-w-[220px]">
              <div className="py-2 bg-white border rounded-md shadow-lg">
                <Link href='/faq' className="block px-4 py-2 text-sm text-black hover:bg-gray-100">
                  FAQs
                </Link>
                <Link href='/contact' className="block px-4 py-2 text-sm text-black hover:bg-gray-100">
                  Contact
                </Link>
                <div className="border-t my-1"></div>
                <Link href='/blog' className="block px-4 py-2 text-sm text-black hover:bg-gray-100">Blog</Link>
              </div>
            </div>
          </div>

          <div className="relative group text-black">
            {/* Categories mega-menu commented out for ContractorFlowHQ */}
          </div>
        </div>

        {/* Menu - right side */}
        <div className="flex-shrink-0 flex justify-end text-black font-bold">
          <Menu />
        </div>
      </div>
    </header> 
  );
}
 
export default Header;
