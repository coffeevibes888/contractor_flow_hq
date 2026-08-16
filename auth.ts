import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/db/prisma';
import { compare } from './lib/encrypt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
    // No `newUser` override: we want the explicit `callbackUrl` to win for
    // flows like "Apply Now" so tenants land on the application wizard, not
    // the generic role-selection page. Users without `onboardingCompleted`
    // are routed to onboarding by the home/dashboard pages on demand.
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // No custom cookie domain needed - using path-based routing, not subdomains
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Removed allowDangerousEmailAccountLinking for security
      // Users must verify email ownership before linking accounts
    }),
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (credentials == null) return null;

        // Find user in database — normalise to lower-case so that a login
        // attempt with "USER@EXAMPLE.COM" still matches the stored record.
        const email = (credentials.email as string).toLowerCase().trim();
        const user = await prisma.user.findFirst({
          where: { email },
        });

        // Check if user exists and if the password matches
        if (user && user.password) {
          const isMatch = await compare(
            credentials.password as string,
            user.password
          );

          // If password is correct, return user
          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        // If user does not exist or password does not match return null
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Handle sign-in - allow OAuth and credentials
    async signIn({ user, account }) {
      // Always allow OAuth sign-ins
      if (account?.provider === 'google') {
        return true;
      }
      // Allow credentials sign-in
      if (account?.provider === 'credentials') {
        return true;
      }
      return true;
    },
    async session({ session, user, trigger, token }) {
      // Set the user ID from the token
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.name = token.name;
      session.user.onboardingCompleted = token.onboardingCompleted;

      // Guard: token.sub must be present before hitting the DB.
      // An undefined sub (e.g. stale cookie or JWT decode failure) would
      // cause Prisma to throw, which surfaces as JWTSessionError.
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              isBlocked: true,
              phoneVerified: true,
              phoneNumber: true,
              address: true,
              shippingAddress: true,
              billingAddress: true,
              image: true,
              onboardingCompleted: true,
              sessionVersion: true,
            },
          });

          if (dbUser) {
            // If user is blocked, invalidate the session immediately
            if (dbUser.isBlocked) {
              session.user.id = undefined as any;
              session.user.role = undefined as any;
              session.expires = new Date(0).toISOString();
              return session;
            }

            // If session version doesn't match (password was changed), invalidate
            if (dbUser.sessionVersion != null && token.sessionVersion != null && dbUser.sessionVersion !== token.sessionVersion) {
              session.user.id = undefined as any;
              session.user.role = undefined as any;
              session.expires = new Date(0).toISOString();
              return session;
            }

            session.user.role = dbUser.role;
            session.user.phoneVerified = dbUser.phoneVerified;
            session.user.phoneNumber = dbUser.phoneNumber;
            session.user.address = dbUser.address;
            session.user.shippingAddress = dbUser.shippingAddress;
            session.user.billingAddress = dbUser.billingAddress;
            session.user.image = dbUser.image || undefined;
            session.user.onboardingCompleted = dbUser.onboardingCompleted;
          }
        } catch (error) {
          // A DB error inside the session callback must not crash Auth.js.
          // The session will still work with the data already in the JWT token.
          console.error('[auth] session callback DB lookup failed:', error);
        }
      }

      // If there is an update, set the user name
      if (trigger === 'update') {
        session.user.name = user.name;
      }

      return session;
    },
    async jwt({ token, user, trigger, session }) {
      // Assign user fields to token
      if (user) {
        token.id = user.id;
        token.role = user.role;

        // Fetch onboarding status and session version from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { onboardingCompleted: true, sessionVersion: true },
        });
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false;
        token.sessionVersion = dbUser?.sessionVersion ?? 0;

        // If user has no name then use the email
        if (user.name === 'NO_NAME') {
          token.name = user.email!.split('@')[0];

          // Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }

        if (trigger === 'signIn' || trigger === 'signUp') {
          // Transfer session cart to user in a server action
          // This avoids using next/headers in the auth config
          if (user.id) {
            try {
              const { transferSessionCartToUser } = await import('./lib/actions/auth.actions');
              await transferSessionCartToUser(user.id);
            } catch (error) {
              console.error('Failed to transfer session cart:', error);
            }

            // Trial reminders are now handled by the daily cron job
            // (/api/cron/send-trial-reminders) instead of per-sign-in.
            // Removed per-user check here to avoid hammering the DB on every login.
          }
        }
      }

      // Handle session updates - refresh role and onboardingCompleted from database
      if (trigger === 'update' && token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, onboardingCompleted: true, name: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.onboardingCompleted = dbUser.onboardingCompleted;
            if (session?.user?.name) {
              token.name = session.user.name;
            }
          }
        } catch (error) {
          console.error('[auth] jwt update DB lookup failed:', error);
        }
      }

      return token;
    },
  },
  events: {
    // Capture every sign-in to the audit log + login-attempt table — covers
    // credentials (including the auto sign-in performed right after signup)
    // as well as OAuth providers like Google, which otherwise never hit our
    // /api/auth/credentials-signin route.
    async signIn({ user, account, isNewUser }) {
      // Pull request IP/UA once and reuse for both the audit log and the
      // login-attempt row. NextAuth callbacks don't get the NextRequest
      // object directly, but `next/headers` works because we're still
      // inside the request scope.
      let ipAddress: string | null = null;
      let userAgent: string | null = null;
      let country: string | null = null;
      try {
        const { requestContextFromHeaders } = await import('./lib/security/request-context');
        const ctx = await requestContextFromHeaders();
        ipAddress = ctx.ipAddress;
        userAgent = ctx.userAgent;
        country = (ctx as any).country ?? null;
      } catch {
        // best-effort — log without IP if extraction fails
      }

      try {
        const { logAuthEvent } = await import('./lib/security/audit-logger');
        await logAuthEvent('AUTH_LOGIN', {
          userId: user?.id,
          email: user?.email ?? undefined,
          success: true,
          role: (user as any)?.role,
          ipAddress: ipAddress ?? undefined,
          userAgent: userAgent ?? undefined,
        });
      } catch (error) {
        console.error('auth events.signIn: audit log failed', error);
      }

      try {
        const { recordLoginAttempt } = await import('./lib/security/login-attempts');
        await recordLoginAttempt({
          email: user?.email ?? null,
          userId: user?.id ?? null,
          success: true,
          reason: 'ok',
          ipAddress: ipAddress ?? undefined,
          country: country ?? undefined,
          userAgent: userAgent ?? undefined,
        });
      } catch (error) {
        console.error('auth events.signIn: loginAttempt write failed', error);
      }

      // New-country login detection — skip on first signup (isNewUser) since
      // there's no prior country to compare against.
      if (!isNewUser && country && user?.id) {
        try {
          const prevLogin = await prisma.loginAttempt.findFirst({
            where: {
              userId: user.id,
              success: true,
              country: { not: null },
              // Exclude the row we just wrote (created within the last 5 seconds)
              createdAt: { lt: new Date(Date.now() - 5000) },
            },
            orderBy: { createdAt: 'desc' },
            select: { country: true },
          });
          if (prevLogin?.country && prevLogin.country !== country) {
            const { notifySuspiciousActivity } = await import('./lib/services/admin-notifications');
            notifySuspiciousActivity({
              type: 'New Country Login',
              description: `${user.email ?? user.id} logged in from ${country} — previous login was from ${prevLogin.country}`,
              userId: user.id,
              userEmail: user.email ?? undefined,
              ipAddress: ipAddress ?? undefined,
              userAgent: userAgent ?? undefined,
              severity: 'medium',
            }).catch(console.error);
          }
        } catch {
          // Never let this block auth
        }
      }

      // Notify for first-time signups — but only for OAuth providers (Google etc.).
      // Credentials signups go through signUpUser (user.actions.ts) which already
      // calls notifyNewSignup directly, so firing it here too causes duplicate emails.
      if (isNewUser && account?.provider !== 'credentials') {
        try {
          const { notifyNewSignup } = await import('./lib/services/admin-notifications');
          await notifyNewSignup({
            name: user?.name ?? 'Unknown',
            email: user?.email ?? 'unknown@local',
            role: (user as any)?.role ?? 'user',
            signupMethod: account?.provider === 'google' ? 'Google' : 'OAuth',
          });
        } catch (error) {
          console.error('auth events.signIn: notifyNewSignup failed', error);
        }
      }
    },
  },
});
