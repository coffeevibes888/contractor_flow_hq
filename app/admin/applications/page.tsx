'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Clock, CheckCircle2, XCircle, Building2, DollarSign,
  Calendar, Loader2, ChevronRight, FileText, MapPin,
} from 'lucide-react';

interface Application {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  monthlyIncome: number | null;
  status: string;
  createdAt: string;
  propertySlug: string | null;
  unit: {
    name: string;
    property: { name: string } | null;
  } | null;
  applicant: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admin/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingApps = applications.filter(app => app.status === 'pending');
  const approvedApps = applications.filter(app => app.status === 'approved');
  const rejectedApps = applications.filter(app => app.status === 'rejected' || app.status === 'denied');

  const filteredApps = activeTab === 'all' ? applications :
    activeTab === 'pending' ? pendingApps :
    activeTab === 'approved' ? approvedApps : rejectedApps;

  const formatUnitLabel = (app: Application) => {
    const unitName = app.unit?.name;
    const propertyName = app.unit?.property?.name;
    if (unitName && propertyName) return `${propertyName} · ${unitName}`;
    if (propertyName) return propertyName;
    return unitName || 'Unit';
  };

  if (loading) {
    return (
      <main className='w-full'>
        <div className='flex items-center justify-center py-20'>
          <Loader2 className='w-8 h-8 animate-spin text-cyan-500' />
        </div>
      </main>
    );
  }

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Applications</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Review and respond to incoming rental applications
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Total</p>
            <div className='h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center'>
              <FileText className='h-3 w-3 text-gray-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{applications.length}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Pending</p>
            <div className='h-6 w-6 rounded-md bg-amber-100 flex items-center justify-center'>
              <Clock className='h-3 w-3 text-amber-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{pendingApps.length}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Approved</p>
            <div className='h-6 w-6 rounded-md bg-green-100 flex items-center justify-center'>
              <CheckCircle2 className='h-3 w-3 text-green-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{approvedApps.length}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] text-gray-500 font-medium'>Rejected</p>
            <div className='h-6 w-6 rounded-md bg-red-100 flex items-center justify-center'>
              <XCircle className='h-3 w-3 text-red-600' />
            </div>
          </div>
          <p className='text-lg font-bold text-gray-900 mt-0.5'>{rejectedApps.length}</p>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className='flex flex-col sm:flex-row gap-3'>
        <div className='relative flex-1'>
          <svg className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
          </svg>
          <input
            type='text'
            placeholder='Search by name or property...'
            className='w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all'
            disabled
          />
        </div>
        <div className='flex items-center gap-1'>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'all' ? 'All' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        {/* Desktop Table */}
        <div className='hidden md:block overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gray-50/80'>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Applicant</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Property</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Income</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Applied</th>
                <th className='text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'>Status</th>
                <th className='text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5'></th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-4 py-12 text-center'>
                    <FileText className='mx-auto h-10 w-10 text-gray-300 mb-3' />
                    <p className='text-sm text-gray-500'>No applications found</p>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className='hover:bg-gray-50/50 transition-colors'>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2.5'>
                        <div className='h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                          {(app.fullName || app.applicant?.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className='text-xs font-semibold text-gray-800'>{app.fullName || app.applicant?.name || 'Applicant'}</p>
                          <p className='text-[10px] text-gray-500'>{app.email || app.applicant?.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-1.5'>
                        <MapPin className='h-3 w-3 text-gray-400' />
                        <span className='text-xs text-gray-700'>{formatUnitLabel(app)}</span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <span className='text-xs font-semibold text-gray-800'>
                        {app.monthlyIncome ? formatCurrency(Number(app.monthlyIncome)) : '—'}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <span className='text-xs text-gray-500'>
                        {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        app.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        app.status === 'approved' ? 'bg-green-50 text-green-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className='text-[11px] text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-0.5 justify-end'
                      >
                        Review <ChevronRight className='h-3 w-3' />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className='md:hidden divide-y divide-gray-100'>
          {filteredApps.length === 0 ? (
            <div className='p-8 text-center'>
              <FileText className='mx-auto h-10 w-10 text-gray-300 mb-3' />
              <p className='text-sm text-gray-500'>No applications found</p>
            </div>
          ) : (
            filteredApps.map((app) => (
              <Link
                key={app.id}
                href={`/admin/applications/${app.id}`}
                className='flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors active:scale-[0.99]'
              >
                <div className='h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                  {(app.fullName || app.applicant?.name || '?')[0].toUpperCase()}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-xs font-semibold text-gray-800 truncate'>
                    {app.fullName || app.applicant?.name || 'Applicant'}
                  </p>
                  <p className='text-[10px] text-gray-500 truncate'>{formatUnitLabel(app)}</p>
                  <p className='text-[10px] text-gray-400'>
                    {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {app.monthlyIncome ? ` · ${formatCurrency(Number(app.monthlyIncome))}/mo` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  app.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                  app.status === 'approved' ? 'bg-green-50 text-green-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {app.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
