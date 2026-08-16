import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/db/prisma';
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, Star } from 'lucide-react';
import { PortfolioItemActions } from './portfolio-item-actions';

export default async function PortfolioItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');
  if (session.user.role !== 'contractor') redirect('/');

  const contractorProfile = await prisma.contractorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!contractorProfile) redirect('/contractor-dashboard');

  const item = await prisma.contractorPortfolioItem.findFirst({
    where: { id, contractorId: contractorProfile.id },
  });
  if (!item) notFound();

  const fmtMoney = (v: any) =>
    v != null
      ? Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/contractor-dashboard/portfolio"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>
        <PortfolioItemActions itemId={item.id} />
      </div>

      {/* Images */}
      {item.images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {item.images.map((src, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${item.title} ${idx + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center text-gray-400">
          No photos on this item
        </div>
      )}

      {/* Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              {item.category}
            </span>
          </div>
          {item.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              Featured
            </span>
          )}
        </div>

        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {item.description}
        </p>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2 border-t border-gray-100">
          {item.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" />
              {item.location}
            </span>
          )}
          {item.projectDate && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              {new Date(item.projectDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
          {item.budget != null && (
            <span className="inline-flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-gray-400" />
              {fmtMoney(item.budget)}
            </span>
          )}
          {item.duration != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              {item.duration} day{item.duration !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
