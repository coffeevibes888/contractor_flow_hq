import { requireAdmin } from '@/lib/auth-guard';
import { getOrCreateCurrentLandlord } from '@/lib/actions/landlord.actions';
import { getCurrentUserTeamRole } from '@/lib/actions/team.actions';
import { getAccountingGateStatus } from '@/lib/accounting/feature-gate';
import { prisma } from '@/db/prisma';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import AccountingUpsellPage from '@/components/accounting/accounting-upsell-page';
import AccountingHelp from '../_components/accounting-help';

export const metadata: Metadata = { title: 'Audit Log' };

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'journal.post':        { label: 'Journal Posted',   color: 'bg-violet-50 text-violet-700' },
  'journal.reverse':     { label: 'Journal Reversed', color: 'bg-rose-50 text-rose-700' },
  'period.close':        { label: 'Period Closed',    color: 'bg-slate-100 text-slate-600' },
  'account.create':      { label: 'Account Created',  color: 'bg-blue-50 text-blue-700' },
  'account.update':      { label: 'Account Updated',  color: 'bg-amber-50 text-amber-700' },
  'statement.generate':  { label: 'Statement Generated', color: 'bg-emerald-50 text-emerald-700' },
  'statement.send':      { label: 'Statement Sent',   color: 'bg-cyan-50 text-cyan-700' },
  'tenant_credit':       { label: 'Tenant Credit',    color: 'bg-teal-50 text-teal-700' },
  'system.backfill':     { label: 'System Backfill',  color: 'bg-gray-100 text-gray-500' },
};

export default async function AuditLogPage() {
  await requireAdmin();
  const landlordResult = await getOrCreateCurrentLandlord();
  if (!landlordResult.success) throw new Error(landlordResult.message ?? 'Unable to determine landlord');
  const landlord = landlordResult.landlord;

  const userRole = await getCurrentUserTeamRole(landlord.id);
  const canView = userRole.isOwner || (userRole.permissions as string[]).includes('view_financials');
  if (!canView) {
    return (
      <main className='w-full px-4 py-10'>
        <div className='max-w-lg mx-auto text-center space-y-4'>
          <div className='mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center'>
            <Lock className='h-7 w-7 text-red-400' />
          </div>
          <h1 className='text-xl font-semibold text-black'>Access Restricted</h1>
          <p className='text-gray-500 text-sm'>Your role does not have permission to view financial reports.</p>
        </div>
      </main>
    );
  }

  const gate = await getAccountingGateStatus(landlord.id);
  if (!gate.canManage) {
    return <AccountingUpsellPage feature='audit-log' currentTier={gate.tier} />;
  }

  const logs = await prisma.accountingAuditLog.findMany({
    where: { landlordId: landlord.id },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  // Get user names for any userId references
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u.name || u.email || 'User']));

  // Group by day for visual separation
  const grouped = logs.reduce((acc, log) => {
    const day = new Date(log.createdAt).toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  return (
    <main className='w-full space-y-5'>
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Audit Log</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Every financial change — who did it, when, and what changed.
          </p>
        </div>
        <span className='text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full self-start'>
          {logs.length} events shown
        </span>
      </div>

      <AccountingHelp block={{ summary: 'Immutable record of every change to your books.', whatItShows: 'Every journal entry posted, account created, statement generated, and period closed — who did it and when. Cannot be edited or deleted.', whenToUse: 'Use during audits, tax season, or anytime you need to trace a financial change back to its source.' }} defaultOpen={false} />

      {logs.length === 0 ? (
        <div className='rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
          <p className='text-sm text-gray-500'>No audit events recorded yet. Financial actions will appear here automatically.</p>
        </div>
      ) : (
        <div className='space-y-6'>
          {Object.entries(grouped).map(([day, dayLogs]) => (
            <div key={day}>
              {/* Day separator */}
              <div className='flex items-center gap-3 mb-3'>
                <div className='h-px flex-1 bg-gray-200' />
                <span className='text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap'>{day}</span>
                <div className='h-px flex-1 bg-gray-200' />
              </div>

              <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
                <div className='divide-y divide-gray-50'>
                  {dayLogs.map((log) => {
                    const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-500' };
                    const who = log.userId ? (userMap.get(log.userId) ?? 'Unknown User') : 'System';
                    const time = new Date(log.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                    return (
                      <div key={log.id} className='px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors'>
                        {/* Timeline dot */}
                        <div className='mt-1 h-2 w-2 rounded-full bg-violet-400 shrink-0' />

                        <div className='flex-1 min-w-0 space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                            <span className='text-xs font-medium text-gray-700'>{log.entityType}</span>
                            <span className='text-[10px] text-gray-400 font-mono'>{log.entityId.slice(0, 8)}…</span>
                          </div>
                          {log.changes && Object.keys(log.changes as object).length > 0 && (
                            <p className='text-[10px] text-gray-500 font-mono truncate'>
                              {JSON.stringify(log.changes).slice(0, 120)}
                            </p>
                          )}
                        </div>

                        <div className='text-right shrink-0'>
                          <p className='text-[10px] font-medium text-gray-600'>{who}</p>
                          <p className='text-[10px] text-gray-400'>{time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
