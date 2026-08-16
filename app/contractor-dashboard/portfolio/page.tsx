import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { Button } from '@/components/ui/button';
import { Camera, Plus, Lightbulb, Star } from 'lucide-react';

export default async function ContractorPortfolioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');
  if (session.user.role !== 'contractor') redirect('/');

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const portfolioItems = contractorProfile
    ? await prisma.contractorPortfolioItem.findMany({
        where: { contractorId: contractorProfile.id },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      })
    : [];

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">My Work</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Showcase completed projects with photos and details
          </p>
        </div>
        <Link href="/contractor-dashboard/portfolio/new">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold self-start">
            <Plus className="h-4 w-4 mr-2" /> Add Work
          </Button>
        </Link>
      </div>

      {/* Portfolio Grid */}
      {portfolioItems.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
            <Camera className="h-7 w-7 text-gray-300" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">No work added yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add photos of your completed projects to build a portfolio customers can browse.
          </p>
          <Link href="/contractor-dashboard/portfolio/new">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Add Your First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {portfolioItems.map((item) => (
            <Link
              key={item.id}
              href={`/contractor-dashboard/portfolio/${item.id}`}
              className="group rounded-xl border border-gray-200 overflow-hidden hover:border-amber-300 hover:shadow-md transition-all bg-white"
            >
              <div className="aspect-square bg-gray-100 overflow-hidden relative">
                {item.images[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-300">
                    <Camera className="h-8 w-8" />
                  </div>
                )}
                {item.featured && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <Star className="h-3 w-3 fill-white" />
                    Featured
                  </span>
                )}
                {item.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {item.images.length} photos
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-amber-600 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {item.category}
                  {item.location ? ` · ${item.location}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50">
        <div className="p-1.5 rounded-lg bg-amber-100 shrink-0">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-800">Portfolio tips</p>
          <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
            <li>• Lead with a strong "after" photo — it's the thumbnail customers see</li>
            <li>• Include before/after pairs to show the transformation</li>
            <li>• Add the project location and budget range to build trust</li>
            <li>• Feature your best 3-4 projects so they show first on your profile</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
