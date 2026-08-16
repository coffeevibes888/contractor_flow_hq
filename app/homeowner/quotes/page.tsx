import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import QuotesClient from './quotes-client';

export default async function HomeownerQuotesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  // Get all quotes for this customer
  const quotes = await prisma.contractorQuote.findMany({
    where: {
      customerId: session.user.id,
    },
    include: {
      contractor: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      lead: {
        select: {
          id: true,
          projectTitle: true,
          projectType: true,
          projectDescription: true,
        },
      },
      _count: {
        select: {
          counterOffers: true,
          messages: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <QuotesClient quotes={quotes} />;
}
