import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Auth config for path-based routing (Vercel Hobby compatible)
 * 
 * No subdomain detection needed - we use /[landlord-slug]/... paths instead
 * Protected routes are on main domain: /admin/*, /user/*, /super-admin/*
 * Public landlord portals are at: /[landlord-slug]/* (handled by dynamic route)
 */
export const authConfig = {
  providers: [], // Required by NextAuthConfig type
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;

      // Known reserved routes that need protection
      const protectedPaths = [
        /^\/shipping-address/,
        /^\/place-order/,
        /^\/profile$/,
        /^\/user\/.*/,  // All user routes require auth
        /^\/order\//,
        /^\/admin\/.*/,  // All admin routes require auth
        /^\/super-admin\/.*/,
        /^\/contractor\/.*/,  // All contractor routes require auth
        /^\/homeowner\/.*/,  // All homeowner routes require auth
        /^\/agent\/.*/,  // All agent routes require auth
        /^\/landlord\/.*/,  // All landlord routes require auth
      ];

      // Public paths that look like they could match protected patterns but shouldn't
      const publicPaths = [
        /^\/sign-in/,
        /^\/sign-up/,
        /^\/verify-email/,
        /^\/forgot-password/,
        /^\/reset-password/,
        /^\/unauthorized/,
        /^\/contractor\/invite/, // Employee invite acceptance page (redirects to sign-up if needed)
        /^\/accept-invite/,      // Public team invite landing page (handles auth itself)
      ];

      // Check if it's a public path first
      const isPublic = publicPaths.some((p) => p.test(pathname));
      if (isPublic) {
        return true;
      }

      // Check if it's a protected path
      const isProtected = protectedPaths.some((p) => p.test(pathname));
      
      if (!auth && isProtected) {
        return false;
      }

      // Set session cart ID cookie if not present
      if (!request.cookies.get('sessionCartId')) {
        const sessionCartId = crypto.randomUUID();

        const response = NextResponse.next({
          request: {
            headers: new Headers(request.headers),
          },
        });

        response.cookies.set('sessionCartId', sessionCartId);

        return response;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
