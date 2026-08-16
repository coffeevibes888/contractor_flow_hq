/**
 * GET /api/super-admin/security/threats
 *
 * Returns live threat signals for the security dashboard:
 *   - Failed-login velocity per IP (credential stuffing)
 *   - IPs with rapid account enumeration (many different emails)
 *   - Concurrent sessions (same user, 3+ IPs in last hour)
 *   - New-country logins in the last 24h
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000);

    const [recentFailed, recentSuccess] = await Promise.all([
      // All failed logins in the last 24h
      prisma.loginAttempt.findMany({
        where: { success: false, createdAt: { gte: twentyFourHoursAgo } },
        select: { ipAddress: true, email: true, createdAt: true, reason: true },
        orderBy: { createdAt: 'desc' },
      }),
      // All successful logins in the last 24h (for country-change detection)
      prisma.loginAttempt.findMany({
        where: { success: true, createdAt: { gte: twentyFourHoursAgo }, userId: { not: null } },
        select: { userId: true, email: true, country: true, createdAt: true, ipAddress: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // ── 1. Failed-login velocity per IP (>5 failures in 60 seconds) ─────────
    const failedPerIpInWindow: Record<string, { count: number; emails: Set<string>; lastAt: Date }> = {};
    for (const a of recentFailed) {
      if (!a.ipAddress) continue;
      if (a.createdAt < sixtySecondsAgo) continue; // only last 60s for the live alert
      const bucket = failedPerIpInWindow[a.ipAddress] ?? {
        count: 0,
        emails: new Set<string>(),
        lastAt: a.createdAt,
      };
      bucket.count++;
      if (a.email) bucket.emails.add(a.email);
      if (a.createdAt > bucket.lastAt) bucket.lastAt = a.createdAt;
      failedPerIpInWindow[a.ipAddress] = bucket;
    }

    const credentialStuffing = Object.entries(failedPerIpInWindow)
      .filter(([, v]) => v.count >= 5)
      .map(([ip, v]) => ({
        ipAddress: ip,
        failureCount: v.count,
        uniqueEmails: v.emails.size,
        lastSeenAt: v.lastAt.toISOString(),
        severity: v.emails.size > 3 ? 'high' : 'medium',
      }))
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 20);

    // ── 2. Account enumeration — IPs probing many different emails (24h) ────
    const enumerationByIp: Record<string, Set<string>> = {};
    for (const a of recentFailed) {
      if (!a.ipAddress || !a.email) continue;
      const s = enumerationByIp[a.ipAddress] ?? new Set<string>();
      s.add(a.email.toLowerCase());
      enumerationByIp[a.ipAddress] = s;
    }
    const enumSuspects = Object.entries(enumerationByIp)
      .filter(([, emails]) => emails.size >= 10)
      .map(([ip, emails]) => ({ ipAddress: ip, uniqueEmailsProbed: emails.size }))
      .sort((a, b) => b.uniqueEmailsProbed - a.uniqueEmailsProbed)
      .slice(0, 10);

    // ── 3. Concurrent sessions — same userId from 3+ distinct IPs in 1 hour ─
    const userIpsInHour: Record<string, Set<string>> = {};
    for (const a of recentSuccess) {
      if (!a.userId || !a.ipAddress) continue;
      if (a.createdAt < oneHourAgo) continue;
      const s = userIpsInHour[a.userId] ?? new Set<string>();
      s.add(a.ipAddress);
      userIpsInHour[a.userId] = s;
    }
    const concurrentSessions = Object.entries(userIpsInHour)
      .filter(([, ips]) => ips.size >= 3)
      .map(([userId, ips]) => {
        const logins = recentSuccess.filter(a => a.userId === userId);
        const email = logins[logins.length - 1]?.email ?? null;
        return { userId, email, distinctIPs: ips.size, ips: Array.from(ips) };
      })
      .sort((a, b) => b.distinctIPs - a.distinctIPs)
      .slice(0, 10);

    // ── 4. New-country logins in 24h ─────────────────────────────────────────
    // Compare each user's login country to their most recent PRIOR country.
    // We need the login just before the 24h window to establish a baseline.
    const newCountryAlerts: Array<{
      userId: string;
      email: string | null;
      previousCountry: string;
      newCountry: string;
      detectedAt: string;
      ipAddress: string | null;
    }> = [];

    const userHistoryMap = new Map<string, typeof recentSuccess>();
    for (const a of recentSuccess) {
      if (!a.userId || !a.country) continue;
      const list = userHistoryMap.get(a.userId) ?? [];
      list.push(a);
      userHistoryMap.set(a.userId, list);
    }

    // For each user with 2+ logins in the window, check if country changed
    for (const [userId, logins] of userHistoryMap) {
      if (logins.length < 2) continue;
      for (let i = 1; i < logins.length; i++) {
        const prev = logins[i - 1];
        const curr = logins[i];
        if (!prev.country || !curr.country) continue;
        if (prev.country === curr.country) continue;
        newCountryAlerts.push({
          userId,
          email: curr.email,
          previousCountry: prev.country,
          newCountry: curr.country,
          detectedAt: curr.createdAt.toISOString(),
          ipAddress: curr.ipAddress,
        });
      }
    }
    newCountryAlerts.sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );

    // ── 5. Bot-signup signals: registrations under 4 seconds ─────────────────
    // AuditLog captures AUTH_SIGNUP; the gap between a pageview on /sign-up and
    // AUTH_SIGNUP is a proxy for "how fast". If pageview table has entries for
    // /sign-up or /(auth)/sign-up in the last 24h, compute time to signup.
    // We approximate by counting signups with suspiciously-fast paths later.
    // For now, return recent signup velocity (>5 signups from same IP = bot signal).
    const recentSignups = await prisma.auditLog.findMany({
      where: { action: 'AUTH_SIGNUP', createdAt: { gte: twentyFourHoursAgo } },
      select: { ipAddress: true, createdAt: true, email: true },
      orderBy: { createdAt: 'desc' },
    });

    const signupsByIp: Record<string, { count: number; lastAt: Date }> = {};
    for (const s of recentSignups) {
      if (!s.ipAddress) continue;
      const b = signupsByIp[s.ipAddress] ?? { count: 0, lastAt: s.createdAt };
      b.count++;
      if (s.createdAt > b.lastAt) b.lastAt = s.createdAt;
      signupsByIp[s.ipAddress] = b;
    }
    const botSignupSuspects = Object.entries(signupsByIp)
      .filter(([, v]) => v.count >= 3)
      .map(([ip, v]) => ({ ipAddress: ip, signupCount: v.count, lastAt: v.lastAt.toISOString() }))
      .sort((a, b) => b.signupCount - a.signupCount)
      .slice(0, 10);

    return NextResponse.json({
      credentialStuffing,
      enumSuspects,
      concurrentSessions,
      newCountryAlerts: newCountryAlerts.slice(0, 20),
      botSignupSuspects,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Threat intel API error:', error);
    return NextResponse.json({ error: 'Failed to load threat data' }, { status: 500 });
  }
}
