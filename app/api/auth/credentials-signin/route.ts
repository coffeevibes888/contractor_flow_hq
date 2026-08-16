import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/auth';
import { prisma } from '@/db/prisma';
import { getSubdomainRedirectUrl } from '@/lib/utils/subdomain-redirect';
import { notifySuspiciousActivity } from '@/lib/services/admin-notifications';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';
import { logAuthEvent } from '@/lib/security/audit-logger';
import { recordLoginAttempt } from '@/lib/security/login-attempts';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const callbackUrl = formData.get('callbackUrl') as string;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password required' }, { status: 400 });
    }

    // Get IP for rate limiting and block checks
    const ip = req.headers.get('cf-connecting-ip') ||
               req.headers.get('x-real-ip') ||
               req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               'unknown';

    // Defense-in-depth: enforce IP block even if middleware was bypassed
    if (ip && ip !== 'unknown') {
      const blocked = await prisma.blockedIP.findUnique({
        where: { ipAddress: ip },
        select: { isActive: true, expiresAt: true },
      });
      const isBlocked =
        blocked?.isActive &&
        (!blocked.expiresAt || blocked.expiresAt > new Date());
      if (isBlocked) {
        return NextResponse.json(
          { success: false, message: 'Access denied.' },
          { status: 403 }
        );
      }
    }
    const userAgent = req.headers.get('user-agent') || undefined;
    const country = req.headers.get('x-vercel-ip-country') || null;
    const region = req.headers.get('x-vercel-ip-country-region') || null;
    const city = req.headers.get('x-vercel-ip-city') || null;

    // Check rate limit for this IP
    const rateLimitKey = `auth:${ip}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.auth);
    
    if (!rateLimit.allowed) {
      // Notify admin of potential brute force
      notifySuspiciousActivity({
        type: 'Brute Force Attempt',
        description: `Too many failed login attempts from IP: ${ip}`,
        userEmail: email,
        ipAddress: ip,
        userAgent,
        severity: 'high',
      }).catch(console.error);

      // Log rate limit hit to audit log
      logAuthEvent('AUTH_FAILED_LOGIN', {
        email,
        ipAddress: ip,
        userAgent,
        success: false,
        failureReason: 'Rate limit exceeded',
      }).catch(console.error);

      recordLoginAttempt({
        email,
        success: false,
        reason: 'rate_limited',
        ipAddress: ip,
        country,
        region,
        city,
        userAgent,
      }).catch(console.error);

      return NextResponse.json({ 
        success: false, 
        message: 'Too many login attempts. Please try again later.' 
      }, { status: 429 });
    }

    // Attempt sign in
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      // Log failed attempt to audit log
      logAuthEvent('AUTH_FAILED_LOGIN', {
        email,
        ipAddress: ip,
        userAgent,
        success: false,
        failureReason: 'Invalid credentials',
      }).catch(console.error);

      recordLoginAttempt({
        email,
        success: false,
        reason: 'bad_password',
        ipAddress: ip,
        country,
        region,
        city,
        userAgent,
      }).catch(console.error);

      // Notify if multiple failures
      if (rateLimit.remaining <= 2) {
        notifySuspiciousActivity({
          type: 'Multiple Failed Logins',
          description: `Multiple failed login attempts for email: ${email}`,
          userEmail: email,
          ipAddress: ip,
          userAgent,
          severity: 'medium',
        }).catch(console.error);
      }
      
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    // Get the authenticated user to determine redirect
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Log successful login to audit log
    logAuthEvent('AUTH_LOGIN', {
      userId: user.id,
      email,
      ipAddress: ip,
      userAgent,
      success: true,
    }).catch(console.error);

    recordLoginAttempt({
      email,
      userId: user.id,
      success: true,
      reason: 'ok',
      ipAddress: ip,
      country,
      region,
      city,
      userAgent,
    }).catch(console.error);

    // Determine redirect URL - ignore default callback URLs, use role-based routing
    const isDefaultCallback = !callbackUrl || 
      callbackUrl.trim() === '/' || 
      callbackUrl.trim() === '/user/dashboard' ||
      callbackUrl.trim() === '/sign-in';
    
    const redirectUrl = isDefaultCallback
      ? await getSubdomainRedirectUrl(user.role, user.id)
      : callbackUrl.trim();

    return NextResponse.json({ 
      success: true, 
      redirectUrl,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
  }
}
