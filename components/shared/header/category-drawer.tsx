import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,} from '@/components/ui/drawer';
import { auth } from '@/auth';
import { MenuIcon, LayoutDashboard, User, Building } from 'lucide-react';
import Link from 'next/link';

const CategoryDrawer = async () => {
  const session = await auth();
  const userRole = session?.user?.role;

  // Don't render anything if user is not logged in
  if (!session?.user) {
    return null;
  }

  // Determine dashboard links based on role
  const getDashboardLinks = () => {
    const links = [];

    if (userRole === 'tenant') {
      links.push({
        label: 'Tenant Dashboard',
        href: '/user/dashboard',
        icon: User,
        description: 'Manage your applications and rentals'
      });
    } else if (userRole === 'landlord' || userRole === 'admin' || userRole === 'superAdmin' || userRole === 'property_manager') {
      links.push({
        label: 'Landlord Dashboard',
        href: '/admin/overview',
        icon: Building,
        description: 'Manage properties and applications'
      });
    }

    return links;
  };

  const dashboardLinks = getDashboardLinks();

  return (
    <Drawer direction='left'>
      <DrawerTrigger asChild>
        <Button variant='outline'>
          <MenuIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-full max-w-sm bg-gradient-to-r from-blue-900 to-indigo-600 text-white'>
        <DrawerHeader>
          <DrawerTitle>Navigation</DrawerTitle>
          <div className='space-y-2 mt-4'>
            {dashboardLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <DrawerClose asChild key={link.href}>
                  <Button
                    variant='ghost'
                    className='w-full justify-start h-auto p-4'
                    asChild
                  >
                    <Link href={link.href} className='flex items-start gap-3'>
                      <IconComponent className='h-5 w-5 mt-0.5 flex-shrink-0' />
                      <div className='text-left'>
                        <div className='font-medium'>{link.label}</div>
                        <div className='text-sm text-slate-300 mt-1'>{link.description}</div>
                      </div>
                    </Link>
                  </Button>
                </DrawerClose>
              );
            })}

            {dashboardLinks.length === 0 && (
              <p className='text-sm text-gray-400'>No dashboard available for your account type.</p>
            )}
          </div>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
};

export default CategoryDrawer;
