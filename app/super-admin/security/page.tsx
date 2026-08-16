import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prismaBase } from '@/db/prisma-base';
import SecurityClient from './security-client';

export const metadata = {
  title: 'Security | Super Admin',
  description: 'Security dashboard and threat monitoring',
};

export default async function SecurityPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'superAdmin') {
    redirect('/unauthorized');
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get landlords without 2FA
  const landlordUsers = await prismaBase.user.findMany({
    where: {
      role: { in: ['property_manager', 'admin'] },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const twoFARecords = await prismaBase.twoFactorAuth.findMany({
    where: { userId: { in: landlordUsers.map((u: any) => u.id) }, isEnabled: true },
    select: { userId: true },
  });

  const usersWithTwoFA = new Set(twoFARecords.map((r: any) => r.userId));
  const usersWithout2FAList = landlordUsers.filter((u: any) => !usersWithTwoFA.has(u.id));

  // Failed logins last 24h
  const failedLoginAttempts = await prismaBase.auditLog.count({
    where: { action: 'AUTH_FAILED_LOGIN', createdAt: { gte: yesterday } },
  });

  // Blocked IPs
  const blockedIPs = await prismaBase.blockedIP.count({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
  });

  // Recent security events
  const recentSecurityEvents = await prismaBase.auditLog.findMany({
    where: {
      OR: [
        { severity: { in: ['WARNING', 'CRITICAL'] } },
        { action: { startsWith: 'AUTH_' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // ── New threat signals ────────────────────────────────────────────────────
  const oneHourAgo  = new Date(now.getTime() - 60 * 60 * 1000);
  const sixtySecAgo = new Date(now.getTime() - 60 * 1000);

  const [recentFailed, recentSuccess, recentSignupAudit] = await Promise.all([
    prismaBase.loginAttempt.findMany({
      where: { success: false, createdAt: { gte: yesterday } },
      select: { ipAddress: true, email: true, createdAt: true },
    }),
    prismaBase.loginAttempt.findMany({
      where: { success: true, createdAt: { gte: yesterday }, userId: { not: null } },
      select: { userId: true, email: true, country: true, createdAt: true, ipAddress: true },
      orderBy: { createdAt: 'asc' },
    }),
    prismaBase.auditLog.findMany({
      where: { action: 'AUTH_SIGNUP', createdAt: { gte: yesterday } },
      select: { ipAddress: true, createdAt: true },
    }),
  ]);

  // Credential-stuffing: IPs with ≥5 failures in last 60 seconds
  const failedPerIp: Record<string, { count: number; emails: Set<string> }> = {};
  for (const a of recentFailed) {
    if (!a.ipAddress || a.createdAt < sixtySecAgo) continue;
    const b = failedPerIp[a.ipAddress] ?? { count: 0, emails: new Set<string>() };
    b.count++;
    if (a.email) b.emails.add(a.email);
    failedPerIp[a.ipAddress] = b;
  }
  const credentialStuffing = Object.entries(failedPerIp)
    .filter(([, v]) => v.count >= 5)
    .map(([ip, v]) => ({ ipAddress: ip, failureCount: v.count, uniqueEmails: v.emails.size }))
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 10);

  // Concurrent sessions: same userId from 3+ IPs in last hour
  const userIps: Record<string, Set<string>> = {};
  for (const a of recentSuccess) {
    if (!a.userId || !a.ipAddress || a.createdAt < oneHourAgo) continue;
    const s = userIps[a.userId] ?? new Set<string>();
    s.add(a.ipAddress);
    userIps[a.userId] = s;
  }
  const concurrentSessions = Object.entries(userIps)
    .filter(([, ips]) => ips.size >= 3)
    .map(([userId, ips]) => {
      const login = recentSuccess.filter(a => a.userId === userId).pop();
      return { userId, email: login?.email ?? null, distinctIPs: ips.size };
    })
    .sort((a, b) => b.distinctIPs - a.distinctIPs)
    .slice(0, 10);

  // New-country logins
  const userHistory = new Map<string, typeof recentSuccess>();
  for (const a of recentSuccess) {
    if (!a.userId || !a.country) continue;
    const list = userHistory.get(a.userId) ?? [];
    list.push(a);
    userHistory.set(a.userId, list);
  }
  const newCountryAlerts: Array<{ email: string | null; from: string; to: string; at: string; ip: string | null }> = [];
  for (const [, logins] of userHistory) {
    for (let i = 1; i < logins.length; i++) {
      const prev = logins[i - 1];
      const curr = logins[i];
      if (prev.country && curr.country && prev.country !== curr.country) {
        newCountryAlerts.push({
          email: curr.email,
          from: prev.country,
          to: curr.country,
          at: curr.createdAt.toISOString(),
          ip: curr.ipAddress,
        });
      }
    }
  }
  newCountryAlerts.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // Bot-signup suspects: ≥3 signups from same IP in 24h
  const signupIps: Record<string, number> = {};
  for (const s of recentSignupAudit) {
    if (!s.ipAddress) continue;
    signupIps[s.ipAddress] = (signupIps[s.ipAddress] ?? 0) + 1;
  }
  const botSignupSuspects = Object.entries(signupIps)
    .filter(([, c]) => c >= 3)
    .map(([ip, count]) => ({ ipAddress: ip, signupCount: count }))
    .sort((a, b) => b.signupCount - a.signupCount)
    .slice(0, 10);

  return (
    <div className='container mx-auto py-8 px-4'>
      <SecurityClient
        stats={{
          usersWithout2FA: usersWithout2FAList.length,
          usersWithout2FAList,
          failedLoginAttempts,
          blockedIPs,
          recentSecurityEvents: recentSecurityEvents.map((e: any) => ({
            id: e.id,
            action: e.action,
            userId: e.userId,
            ipAddress: e.ipAddress,
            severity: e.severity,
            createdAt: e.createdAt.toISOString(),
          })),
          credentialStuffing,
          concurrentSessions,
          newCountryAlerts: newCountryAlerts.slice(0, 15),
          botSignupSuspects,
        }}
      />
    </div>
  );
}
