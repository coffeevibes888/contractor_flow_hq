/**
 * Internal API route for IP blocking checks
 * Called by middleware to verify if an IP is blocked
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export const runtime = 'nodejs'; // Use Node.js runtime for Prisma

export async function POST(request: NextRequest) {
  try {
    const { ip } = await request.json();
    
    if (!ip) {
      return NextResponse.json({ blocked: false });
    }

    const blockedIP = await prisma.blockedIP.findUnique({
      where: { ipAddress: ip },
      select: {
        isActive: true,
        expiresAt: true,
        reason: true
      }
    });

    if (!blockedIP?.isActive) {
      return NextResponse.json({ blocked: false });
    }

    // Check if block has expired
    if (blockedIP.expiresAt && new Date() > blockedIP.expiresAt) {
      // Block expired, deactivate it
      await prisma.blockedIP.update({
        where: { ipAddress: ip },
        data: { isActive: false }
      });
      return NextResponse.json({ blocked: false });
    }

    // IP is blocked
    return NextResponse.json({
      blocked: true,
      reason: blockedIP.reason || 'Your IP address has been blocked.'
    });
  } catch (error) {
    console.error('IP block check error:', error);
    // On error, don't block the request
    return NextResponse.json({ blocked: false });
  }
}

// Made with Bob
