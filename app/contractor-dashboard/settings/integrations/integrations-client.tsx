'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, RefreshCw, ExternalLink, Lock,
  Zap, AlertTriangle, FileText, Receipt, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tier: string;
  qbConnected: boolean;
  qbConnectedAt: string | null;
  qbLastSyncAt: string | null;
  qbCompanyName: string | null;
  unsyncedInvoices: number;
  unsyncedExpenses: number;
  qbStatus: string | null;
}

export function IntegrationsClient({
  tier, qbConnected: initialConnected, qbConnectedAt, qbLastSyncAt,
  qbCompanyName, unsyncedInvoices, unsyncedExpenses, qbStatus,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const isProOrEnterprise = tier === 'pro' || tier === 'enterprise';

  useEffect(() => {
    if (qbStatus === 'connected') toast.success('QuickBooks connected successfully');
    if (qbStatus === 'error') toast.error('QuickBooks connection failed — please try again');
  }, [qbStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/contractor/quickbooks/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        toast.success(`Synced ${data.invoicesSynced} invoices and ${data.expensesSynced} expenses`);
      } else {
        toast.error(data.error ?? 'Sync failed');
      }
    } finally {
      setSyncing(false);
    }
  };

  const totalPending = unsyncedInvoices + unsyncedExpenses;

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Integrations</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Connect third-party tools to sync your data</p>
      </div>

      {/* QuickBooks Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* QB logo placeholder */}
            <div className="h-10 w-10 rounded-lg bg-[#2CA01C] flex items-center justify-center text-white font-bold text-sm shrink-0">
              QB
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">QuickBooks Online</h2>
              <p className="text-xs text-gray-500">Sync invoices and expenses to your accounting software</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {initialConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                <XCircle className="h-3.5 w-3.5" /> Not connected
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {!isProOrEnterprise ? (
            /* Upsell for Starter */
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
              <Lock className="h-8 w-8 mx-auto text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-gray-800 mb-1">QuickBooks sync requires Pro or Enterprise</p>
              <p className="text-xs text-gray-500 mb-4">
                Automatically push invoices and expenses to QuickBooks so your accountant always has up-to-date books.
              </p>
              <Link href="/contractor-dashboard/settings/subscription">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Zap className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Pro
                </Button>
              </Link>
            </div>
          ) : !initialConnected ? (
            /* Connect CTA */
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Connect your QuickBooks Online account to automatically sync:
              </p>
              <ul className="space-y-1.5">
                {[
                  { icon: FileText, text: 'Invoices → QB Invoices (with line items, customer, amounts)' },
                  { icon: Receipt, text: 'Expenses → QB Purchases (categorized by type)' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2 text-xs text-gray-700">
                    <Icon className="h-3.5 w-3.5 text-[#2CA01C] shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <a href="/api/contractor/quickbooks/connect">
                <Button className="bg-[#2CA01C] hover:bg-[#238016] text-white mt-2">
                  Connect QuickBooks <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          ) : (
            /* Connected state */
            <div className="space-y-4">
              {/* Connection info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {qbCompanyName && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Company</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{qbCompanyName}</p>
                  </div>
                )}
                {qbConnectedAt && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Connected</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {new Date(qbConnectedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {qbLastSyncAt && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Last Sync</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {new Date(qbLastSyncAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Pending sync items */}
              {totalPending > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-800 flex-1">
                    <span className="font-bold">{totalPending} items</span> waiting to sync —{' '}
                    {unsyncedInvoices > 0 && `${unsyncedInvoices} invoice${unsyncedInvoices !== 1 ? 's' : ''}`}
                    {unsyncedInvoices > 0 && unsyncedExpenses > 0 && ', '}
                    {unsyncedExpenses > 0 && `${unsyncedExpenses} expense${unsyncedExpenses !== 1 ? 's' : ''}`}
                  </p>
                </div>
              )}

              {totalPending === 0 && !syncResult && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs text-emerald-800 font-medium">Everything is synced to QuickBooks</p>
                </div>
              )}

              {/* Sync result */}
              {syncResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                  <p className="text-xs font-bold text-emerald-800">Sync complete</p>
                  <p className="text-xs text-emerald-700">
                    ✓ {syncResult.invoicesSynced} invoices · ✓ {syncResult.expensesSynced} expenses
                  </p>
                  {syncResult.errors?.length > 0 && (
                    <p className="text-xs text-red-600">
                      {syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''} — check console
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleSync} disabled={syncing}
                  className="bg-[#2CA01C] hover:bg-[#238016] text-white">
                  {syncing
                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Syncing…</>
                    : <><RefreshCw className="h-4 w-4 mr-2" /> Sync Now</>}
                </Button>
                <a href="/api/contractor/quickbooks/connect">
                  <Button variant="outline" size="sm" className="border-gray-200 text-xs">
                    Reconnect
                  </Button>
                </a>
              </div>

              <p className="text-[10px] text-gray-400">
                Syncs invoices with status: sent, paid, partial, viewed. Syncs all non-rejected expenses.
                Each item is only pushed once — updates are not yet synced back.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payroll note */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Payroll → QuickBooks coming soon</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Once Stripe Treasury is approved, payroll journal entries (gross pay, deductions, net pay)
              will automatically post to QuickBooks as journal entries. Direct deposit will be enabled at the same time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
