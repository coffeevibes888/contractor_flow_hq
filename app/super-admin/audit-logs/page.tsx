import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prismaBase } from '@/db/prisma-base';
import AuditLogsClient from './audit-logs-client';

export const metadata = {
  title: 'Audit Logs | Super Admin',
  description: 'View security and financial audit logs',
};

const PAGE_SIZE = 50;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; severity?: string; search?: string }>;
}) {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== 'superAdmin') {
    redirect('/unauthorized');
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const severityFilter = params.severity || 'all';
  const searchFilter = params.search || '';

  // Build where clause for filtering
  const where: any = {};
  if (severityFilter !== 'all') {
    where.severity = severityFilter;
  }
  if (searchFilter) {
    where.OR = [
      { action: { contains: searchFilter, mode: 'insensitive' } },
      { userId: { contains: searchFilter, mode: 'insensitive' } },
      { ipAddress: { contains: searchFilter, mode: 'insensitive' } },
    ];
  }

  // Fetch paginated audit logs + total count in parallel
  const [auditLogs, totalFiltered, totalLogs, criticalLogs, authEvents, financialEvents] = await Promise.all([
    prismaBase.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prismaBase.auditLog.count({ where }),
    prismaBase.auditLog.count(),
    prismaBase.auditLog.count({ where: { severity: 'CRITICAL' } }),
    prismaBase.auditLog.count({ where: { action: { startsWith: 'AUTH_' } } }),
    prismaBase.auditLog.count({ where: { action: { startsWith: 'PAYMENT_' } } }),
  ]);

  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  return (
    <div className='container mx-auto py-8 px-4'>
      <AuditLogsClient 
        initialLogs={auditLogs.map((log: any) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        }))}
        stats={{
          totalLogs,
          criticalLogs,
          authEvents,
          financialEvents,
        }}
        pagination={{
          page,
          totalPages,
          totalFiltered,
          pageSize: PAGE_SIZE,
        }}
        currentFilters={{
          severity: severityFilter,
          search: searchFilter,
        }}
      />
    </div>
  );
}
