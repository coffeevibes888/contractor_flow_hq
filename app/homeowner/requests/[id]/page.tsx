import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/db/prisma';
import RequestDetailClient from './request-detail-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  
  if (!session?.user?.id) return redirect('/sign-in');

  // Verify ownership
  const lead = await prisma.contractorLead.findUnique({
    where: { id },
    include: {
      matches: {
        include: {
          contractor: true
        },
        orderBy: { matchScore: 'desc' }
      }
    }
  });

  if (!lead) return notFound();
  
  if (lead.customerUserId !== session.user.id) {
    return redirect('/homeowner/dashboard');
  }

  // Format matches for client
  const matches = lead.matches.map(m => ({
    id: m.id,
    status: m.status,
    matchScore: m.matchScore,
    contractor: {
      id: m.contractor.id,
      businessName: m.contractor.businessName,
      displayName: m.contractor.displayName || m.contractor.businessName,
      slug: m.contractor.slug,
      rating: 4.8, // Placeholder until rating system is fully linked
      jobsCompleted: 12 // Placeholder
    }
  }));

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/homeowner/dashboard">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Request Details</h1>
        </div>

        <RequestDetailClient 
          lead={{
            id: lead.id,
            projectType: lead.projectType,
            projectDescription: lead.projectDescription,
            urgency: lead.urgency,
            status: lead.status,
            createdAt: lead.createdAt.toISOString()
          }}
          matches={matches}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}
