import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`newsletter:${clientId}`, RATE_LIMIT_CONFIGS.sensitive);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, name, source } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { message: 'You\'re already subscribed!' },
          { status: 200 }
        );
      }
      
      // Resubscribe if previously unsubscribed
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: {
          status: 'active',
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      });
      
      return NextResponse.json({ message: 'Welcome back! You\'ve been resubscribed.' });
    }

    // Create new subscriber
    await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        source: source || 'homepage',
        status: 'active',
      },
    });

    return NextResponse.json({ message: 'Successfully subscribed!' });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
