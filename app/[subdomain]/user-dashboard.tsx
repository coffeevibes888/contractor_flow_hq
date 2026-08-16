'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  DollarSign, 
  FileText, 
  Wrench, 
  Calendar,
  MapPin,
  User,
  Bell,
  CreditCard,
  FileSignature,
  ReceiptText,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';

interface UserDashboardProps {
  tenantLease: {
    id: string;
    rentAmount: number;
    unit: {
      name: string;
      rentAmount: number;
      property: {
        name: string;
        address?: any;
      };
    };
  };
  landlord: {
    id: string;
    name: string;
  };
}

export default function UserDashboard({ tenantLease, landlord }: UserDashboardProps) {
  // Mock data - in production, this would come from your APIs
  const tenantInfo = {
    nextRentDue: '2024-01-01',
    rentAmount: '$2,500',
    daysUntilDue: 15,
    maintenanceRequests: 1,
    unreadNotifications: 3,
  };

  return (
    <main className='w-full'>
      <div className='max-w-7xl space-y-6 text-slate-50'>
        <div>
          <h1 className='text-3xl md:text-4xl font-semibold text-white mb-2'>
            Welcome back, Tenant
          </h1>
          <p className='text-base text-slate-100'>
            Manage your rental and stay connected with {landlord.name}.
          </p>
        </div>

        {/* Current Rental Info */}
        <Card className='border border-white/10 bg-slate-900/60'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-slate-50'>
              <Home className='h-5 w-5' />
              Your Current Rental
            </CardTitle>
            <CardDescription className='text-slate-300/80'>Details about your leased property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-4'>
                <div className='flex items-center gap-3'>
                  <MapPin className='h-4 w-4 text-violet-200/80' />
                  <div>
                    <p className='font-medium text-slate-50'>{tenantLease.unit.property.name}</p>
                    <p className='text-sm text-slate-300/80'>
                      {tenantLease.unit.name} • {typeof tenantLease.unit.property.address === 'string' ? tenantLease.unit.property.address : 'Address not available'}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <User className='h-4 w-4 text-violet-200/80' />
                  <div>
                    <p className='font-medium text-slate-50'>Landlord</p>
                    <p className='text-sm text-slate-300/80'>{landlord.name}</p>
                  </div>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='flex items-center gap-3'>
                  <DollarSign className='h-4 w-4 text-violet-200/80' />
                  <div>
                    <p className='font-medium text-slate-50'>Monthly Rent</p>
                    <p className='text-sm text-slate-300/80'>{tenantInfo.rentAmount}</p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Calendar className='h-4 w-4 text-violet-200/80' />
                  <div>
                    <p className='font-medium text-slate-50'>Next Payment Due</p>
                    <p className='text-sm text-slate-300/80'>{tenantInfo.nextRentDue}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <Card className='border border-white/10 bg-slate-900/60'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-slate-50'>
                <CreditCard className='h-5 w-5' />
                Rent Payment
              </CardTitle>
              <CardDescription className='text-slate-300/80'>
                Due in {tenantInfo.daysUntilDue} days
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-emerald-300'>{tenantInfo.rentAmount}</div>
                <p className='text-sm text-slate-300/80'>Next payment: {tenantInfo.nextRentDue}</p>
              </div>
              <Button className='w-full bg-violet-500 hover:bg-violet-400 text-white'>
                Pay Rent Now
              </Button>
            </CardContent>
          </Card>

          <Card className='border border-white/10 bg-slate-900/60'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-slate-50'>
                <Wrench className='h-5 w-5' />
                Maintenance
              </CardTitle>
              <CardDescription className='text-slate-300/80'>
                {tenantInfo.maintenanceRequests} active request(s)
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-slate-50'>{tenantInfo.maintenanceRequests}</div>
                <p className='text-sm text-slate-300/80'>Active requests</p>
              </div>
              <Link href='/user/maintenance'>
                <Button variant='outline' className='w-full border-white/10 text-slate-200/90 hover:bg-slate-900/80'>
                  Manage Requests
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className='border border-white/10 bg-slate-900/60'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-slate-50'>
                <Bell className='h-5 w-5' />
                Notifications
              </CardTitle>
              <CardDescription className='text-slate-300/80'>
                {tenantInfo.unreadNotifications} unread message(s)
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-slate-50'>{tenantInfo.unreadNotifications}</div>
                <p className='text-sm text-slate-300/80'>Unread notifications</p>
              </div>
              <Link href='/user/notifications'>
                <Button variant='outline' className='w-full border-white/10 text-slate-200/90 hover:bg-slate-900/80'>
                  View Messages
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Navigation Cards - Show all sidebar links on mobile */}
        <div className='md:hidden space-y-4'>
          <h2 className='text-xl font-semibold text-white'>Navigation</h2>
          <div className='grid gap-3'>
            <Link
              href='/user/profile'
              className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-start gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'
            >
              <div className='h-9 w-9 rounded-lg bg-white/5 text-violet-200/80 flex items-center justify-center shrink-0 ring-1 ring-white/10'>
                <User className='h-4 w-4' />
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-sm font-semibold text-slate-50'>Profile</span>
                <span className='text-xs text-slate-300/80'>Manage your personal details</span>
              </div>
            </Link>

            <Link
              href='/user/profile/application'
              className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-start gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'
            >
              <div className='h-9 w-9 rounded-lg bg-white/5 text-violet-200/80 flex items-center justify-center shrink-0 ring-1 ring-white/10'>
                <FileText className='h-4 w-4' />
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-sm font-semibold text-slate-50'>Application</span>
                <span className='text-xs text-slate-300/80'>View your rental application</span>
              </div>
            </Link>

            <Link
              href='/user/profile/lease'
              className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-start gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'
            >
              <div className='h-9 w-9 rounded-lg bg-white/5 text-violet-200/80 flex items-center justify-center shrink-0 ring-1 ring-white/10'>
                <FileSignature className='h-4 w-4' />
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-sm font-semibold text-slate-50'>Lease</span>
                <span className='text-xs text-slate-300/80'>Review lease documents</span>
              </div>
            </Link>

            <Link
              href='/user/profile/rent-receipts'
              className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-start gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'
            >
              <div className='h-9 w-9 rounded-lg bg-white/5 text-violet-200/80 flex items-center justify-center shrink-0 ring-1 ring-white/10'>
                <ReceiptText className='h-4 w-4' />
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-sm font-semibold text-slate-50'>Rent Receipts</span>
                <span className='text-xs text-slate-300/80'>Download payment receipts</span>
              </div>
            </Link>

            <Link
              href='/user/profile/ticket'
              className='rounded-xl border border-white/10 bg-slate-900/60 p-4 flex items-start gap-3 hover:border-violet-400/60 hover:bg-slate-900/90 transition-colors cursor-pointer'
            >
              <div className='h-9 w-9 rounded-lg bg-white/5 text-violet-200/80 flex items-center justify-center shrink-0 ring-1 ring-white/10'>
                <MessageCircle className='h-4 w-4' />
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-sm font-semibold text-slate-50'>Create Ticket</span>
                <span className='text-xs text-slate-300/80'>Submit a maintenance request</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className='border border-white/10 bg-slate-900/60'>
          <CardHeader>
            <CardTitle className='text-slate-50'>Recent Activity</CardTitle>
            <CardDescription className='text-slate-300/80'>Your latest rental activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center justify-between p-3 bg-slate-900/80 rounded-lg border border-white/10'>
                <div className='flex items-center gap-3'>
                  <CreditCard className='h-4 w-4 text-emerald-300' />
                  <div>
                    <p className='text-sm font-medium text-slate-50'>Rent payment confirmed</p>
                    <p className='text-xs text-slate-300/80'>December 1, 2024</p>
                  </div>
                </div>
                <Badge variant='secondary' className='bg-emerald-500/20 text-emerald-200/90 border-emerald-400/40'>Paid</Badge>
              </div>
              
              <div className='flex items-center justify-between p-3 bg-slate-900/80 rounded-lg border border-white/10'>
                <div className='flex items-center gap-3'>
                  <FileText className='h-4 w-4 text-violet-300' />
                  <div>
                    <p className='text-sm font-medium text-slate-50'>Lease agreement renewed</p>
                    <p className='text-xs text-slate-300/80'>November 15, 2024</p>
                  </div>
                </div>
                <Badge variant='secondary' className='bg-violet-500/20 text-violet-200/90 border-violet-400/40'>Active</Badge>
              </div>
              
              <div className='flex items-center justify-between p-3 bg-slate-900/80 rounded-lg border border-white/10'>
                <div className='flex items-center gap-3'>
                  <Wrench className='h-4 w-4 text-amber-300' />
                  <div>
                    <p className='text-sm font-medium text-slate-50'>Maintenance request completed</p>
                    <p className='text-xs text-slate-300/80'>November 10, 2024</p>
                  </div>
                </div>
                <Badge variant='secondary' className='bg-amber-500/20 text-amber-200/90 border-amber-400/40'>Resolved</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
