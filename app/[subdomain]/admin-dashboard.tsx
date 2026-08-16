'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  DollarSign, 
  FileText, 
  Wrench, 
  CreditCard, 
  Wallet, 
  Palette, 
  TrendingUp,
  Home,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { adminNavLinks } from '@/lib/constants/admin-nav';

interface AdminDashboardProps {
  landlord: {
    id: string;
    name: string;
    subdomain: string;
  };
}

export default function AdminDashboard({ landlord }: AdminDashboardProps) {
  // Mock data - in production, this would come from your analytics API
  const stats = {
    totalProperties: 12,
    totalUnits: 48,
    occupiedUnits: 42,
    totalTenants: 42,
    totalRevenue: 125000,
    pendingApplications: 8,
    openMaintenanceTickets: 3,
    monthlyRevenue: 18500,
  };

  const occupancyRate = ((stats.occupiedUnits / stats.totalUnits) * 100).toFixed(1);

  return (
    <main className='w-full'>
      <div className='max-w-7xl space-y-6 text-slate-50'>
        <div>
          <h1 className='text-3xl md:text-4xl font-semibold text-white mb-2'>
            Welcome back, {landlord.name}
          </h1>
          <p className='text-base text-slate-100'>
            Here's what's happening with your properties today.
          </p>
        </div>

        {/* Key Metrics */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <Link href='/admin/dashboard/properties' className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-slate-300/90 uppercase tracking-wide'>Total Properties</span>
              <Building2 className='h-4 w-4 text-violet-200/80' />
            </div>
            <div>
              <div className='text-2xl font-semibold text-slate-50'>{stats.totalProperties}</div>
              <p className='text-xs text-slate-300/80 mt-1'>
                <ArrowUpRight className='inline h-3 w-3 mr-1' />
                +2 from last month
              </p>
            </div>
          </Link>

          <Link href='/admin/revenue' className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-slate-300/90 uppercase tracking-wide'>Occupancy Rate</span>
              <Home className='h-4 w-4 text-violet-200/80' />
            </div>
            <div>
              <div className='text-2xl font-semibold text-slate-50'>{occupancyRate}%</div>
              <p className='text-xs text-slate-300/80 mt-1'>
                {stats.occupiedUnits} of {stats.totalUnits} units occupied
              </p>
            </div>
          </Link>

          <Link href='/admin/tenants' className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-slate-300/90 uppercase tracking-wide'>Total Tenants</span>
              <Users className='h-4 w-4 text-violet-200/80' />
            </div>
            <div>
              <div className='text-2xl font-semibold text-slate-50'>{stats.totalTenants}</div>
              <p className='text-xs text-slate-300/80 mt-1'>
                <ArrowUpRight className='inline h-3 w-3 mr-1' />
                +3 new this month
              </p>
            </div>
          </Link>

          <Link href='/admin/revenue' className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex flex-col gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-slate-300/90 uppercase tracking-wide'>Monthly Revenue</span>
              <DollarSign className='h-4 w-4 text-violet-200/80' />
            </div>
            <div>
              <div className='text-2xl font-semibold text-slate-50'>${stats.monthlyRevenue.toLocaleString()}</div>
              <p className='text-xs text-slate-300/80 mt-1'>
                <ArrowUpRight className='inline h-3 w-3 mr-1' />
                +12.5% from last month
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='rounded-xl border border-white/10 bg-slate-900/60 p-5 space-y-4'>
            <div>
              <h3 className='text-lg font-semibold text-slate-50'>Quick Actions</h3>
              <p className='text-xs text-slate-300/80 mt-1'>Common tasks and shortcuts</p>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <Link href='/admin/dashboard/properties'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <Building2 className='h-4 w-4 mr-2' />
                  Properties
                </Button>
              </Link>
              <Link href='/admin/applications'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <FileText className='h-4 w-4 mr-2' />
                  Applications
                </Button>
              </Link>
              <Link href='/admin/tenants'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <Users className='h-4 w-4 mr-2' />
                  Tenants
                </Button>
              </Link>
              <Link href='/admin/maintenance'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <Wrench className='h-4 w-4 mr-2' />
                  Maintenance
                </Button>
              </Link>
              <Link href='/admin/revenue'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <CreditCard className='h-4 w-4 mr-2' />
                  Revenue
                </Button>
              </Link>
              <Link href='/admin/payouts'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <Wallet className='h-4 w-4 mr-2' />
                  Payouts
                </Button>
              </Link>
              <Link href='/admin/analytics'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <TrendingUp className='h-4 w-4 mr-2' />
                  Analytics
                </Button>
              </Link>
              <Link href='/admin/branding'>
                <Button variant='outline' className='w-full justify-start border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                  <Palette className='h-4 w-4 mr-2' />
                  Branding
                </Button>
              </Link>
            </div>
          </div>

          <div className='rounded-xl border border-white/10 bg-slate-900/60 p-5 space-y-4'>
            <div>
              <h3 className='text-lg font-semibold text-slate-50'>Recent Activity</h3>
              <p className='text-xs text-slate-300/80 mt-1'>Latest updates and notifications</p>
            </div>
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10'>
                <div className='flex items-center gap-3'>
                  <FileText className='h-4 w-4 text-blue-400' />
                  <div>
                    <p className='text-sm font-medium text-slate-50'>New rental application</p>
                    <p className='text-xs text-slate-300/80'>2 hours ago</p>
                  </div>
                </div>
                <Badge variant='secondary' className='bg-white/10 text-slate-50'>{stats.pendingApplications}</Badge>
              </div>
              
              <div className='flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10'>
                <div className='flex items-center gap-3'>
                  <Wrench className='h-4 w-4 text-orange-400' />
                  <div>
                    <p className='text-sm font-medium text-slate-50'>Maintenance request</p>
                    <p className='text-xs text-slate-300/80'>5 hours ago</p>
                  </div>
                </div>
                <Badge variant='secondary' className='bg-white/10 text-slate-50'>{stats.openMaintenanceTickets}</Badge>
              </div>
              
              <div className='flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10'>
                <div className='flex items-center gap-3'>
                  <DollarSign className='h-4 w-4 text-green-400' />
                  <div>
                    <p className='text-sm font-medium text-slate-50'>Rent payment received</p>
                    <p className='text-xs text-slate-300/80'>1 day ago</p>
                  </div>
                </div>
                <Badge variant='secondary' className='bg-white/10 text-slate-50'>+$2,500</Badge>
              </div>
            </div>
            
            <Link href='/admin/notifications'>
              <Button variant='outline' className='w-full border-white/20 text-slate-50 hover:bg-white/10 hover:text-white'>
                View All Activity
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {adminNavLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-start gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'
              >
                <div className='h-9 w-9 rounded-lg bg-white/5 text-violet-200/80 flex items-center justify-center shrink-0 ring-1 ring-white/10'>
                  <Icon className='h-4 w-4' />
                </div>
                <div className='flex flex-col gap-1'>
                  <span className='text-sm font-semibold text-slate-50'>{item.title}</span>
                  <span className='text-xs text-slate-300/80'>{item.description}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
