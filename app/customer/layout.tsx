import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  DollarSign, 
  MessageSquare, 
  Calendar,
  Star
} from 'lucide-react';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const navItems = [
    {
      href: '/customer/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/customer/jobs',
      label: 'My Jobs',
      icon: Briefcase,
    },
    {
      href: '/customer/quotes',
      label: 'Quotes',
      icon: FileText,
    },
    {
      href: '/customer/payments',
      label: 'Payments',
      icon: DollarSign,
    },
    {
      href: '/customer/messages',
      label: 'Messages',
      icon: MessageSquare,
    },
    {
      href: '/customer/appointments',
      label: 'Appointments',
      icon: Calendar,
    },
    {
      href: '/customer/reviews',
      label: 'Reviews',
      icon: Star,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm p-4 sticky top-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 px-2">
                Customer Portal
              </h2>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
