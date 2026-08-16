import { prisma } from '@/db/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import HiringApplicationForm from './application-form';

const db = prisma as any;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ post?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { post: postId } = await searchParams;

  const contractor = await prisma.contractorProfile.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    select: { businessName: true },
  });

  return {
    title: contractor ? `Apply - ${contractor.businessName}` : 'Apply',
    description: 'Submit your application to join the team',
  };
}

export default async function ApplyPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { post: postId } = await searchParams;

  // Find the contractor
  const contractor = await prisma.contractorProfile.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    select: { id: true, businessName: true, displayName: true, coverPhoto: true, baseCity: true, baseState: true },
  });

  if (!contractor) return notFound();

  // Get active hiring posts
  const posts = await db.contractorHiringPost.findMany({
    where: { contractorId: contractor.id, status: 'active' },
    select: {
      id: true, title: true, description: true, employeeType: true,
      payType: true, payRangeMin: true, payRangeMax: true,
      requiredSkills: true, requiredCerts: true, experienceYears: true,
      driversLicense: true, backgroundCheck: true, requireResume: true,
      requireId: true, customQuestions: true, city: true, state: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">{contractor.businessName}</h1>
        <p className="text-muted-foreground">No open positions at this time. Check back later.</p>
      </div>
    );
  }

  // If a specific post is requested, use that; otherwise show the first one
  const selectedPost = postId ? posts.find((p: any) => p.id === postId) || posts[0] : posts[0];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{contractor.businessName}</h1>
        {contractor.baseCity && contractor.baseState && (
          <p className="text-muted-foreground mt-1">{contractor.baseCity}, {contractor.baseState}</p>
        )}
      </div>

      <HiringApplicationForm
        contractor={{ id: contractor.id, businessName: contractor.businessName }}
        posts={posts}
        selectedPostId={selectedPost.id}
      />
    </div>
  );
}
