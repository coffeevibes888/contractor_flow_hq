import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  ShoppingBag,
  ExternalLink,
  Sparkles,
  ScanLine,
  Smartphone,
  Info,
  Star,
} from 'lucide-react';
import {
  equipmentTiers,
  equipmentCategories,
  type EquipmentCategory,
} from '@/lib/constants/equipment-shop';
import { getContractorProfileForUser } from '@/lib/contractor-profile';

export const metadata: Metadata = {
  title: 'Equipment Shop',
  description: 'Curated scanners, label printers, and supplies for contractors',
};

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ContractorShopPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const contractorProfile = await getContractorProfileForUser(session.user.id, {
    id: true,
  });

  if (!contractorProfile) {
    return redirect('/onboarding/contractor');
  }

  const params = await searchParams;
  const activeCategory = (params.category as EquipmentCategory | 'all') || 'all';

  const visibleItems = activeCategory === 'all'
    ? equipmentTiers
    : equipmentTiers.filter((item) => item.category === activeCategory);

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2'>
            <ShoppingBag className='h-6 w-6 text-violet-600' />
            Equipment Shop
          </h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Curated scanners, label printers, and supplies that work with Property Flow HQ
          </p>
        </div>
      </div>

      {/* Built-in promo */}
      <div className='rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50 p-4'>
        <div className='flex items-start gap-3'>
          <div className='shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center'>
            <Smartphone className='h-5 w-5 text-white' />
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h3 className='text-sm font-bold text-gray-900'>Already in your pocket: phone-camera scanner</h3>
              <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold'>
                FREE
              </span>
            </div>
            <p className='text-xs text-gray-700 mt-0.5'>
              Property Flow HQ has a built-in barcode + QR scanner that uses your phone or laptop camera.
              Use it now in inventory, receiving, and label history.
            </p>
            <div className='flex flex-wrap gap-2 mt-2'>
              <Link
                href='/contractor-dashboard/inventory/locate'
                className='inline-flex items-center gap-1 rounded-lg bg-white border border-violet-200 hover:border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors'
              >
                <ScanLine className='h-3.5 w-3.5' />
                Try the scanner
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className='flex flex-wrap gap-2'>
        {equipmentCategories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <Link
              key={cat.id}
              href={cat.id === 'all' ? '/contractor-dashboard/shop' : `/contractor-dashboard/shop?category=${cat.id}`}
              className={`inline-flex flex-col items-start gap-0 rounded-xl border px-3 py-2 transition-all ${
                isActive
                  ? 'border-violet-300 bg-violet-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`text-xs font-bold ${isActive ? 'text-violet-700' : 'text-gray-700'}`}>
                {cat.label}
              </span>
              <span className='text-[10px] text-gray-500'>{cat.description}</span>
            </Link>
          );
        })}
      </div>

      {/* Affiliate disclosure */}
      <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-start gap-2'>
        <Info className='h-3.5 w-3.5 text-gray-500 shrink-0 mt-0.5' />
        <p className='text-[11px] text-gray-600 leading-relaxed'>
          We earn a small commission when you buy through these links — at no extra cost to you. Prices and availability are
          set by the merchant. We only recommend gear our team has tested or that has strong reviews from contractors.
        </p>
      </div>

      {/* Items grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          // Category-specific tile gradients so each card feels distinct
          const tileGradient =
            item.category === 'scanner'
              ? 'from-violet-500 via-purple-500 to-fuchsia-500'
              : item.category === 'printer'
                ? 'from-sky-500 via-cyan-500 to-blue-500'
                : item.category === 'labels'
                  ? 'from-amber-500 via-orange-500 to-rose-500'
                  : 'from-emerald-500 via-teal-500 to-cyan-500';

          return (
            <div
              key={item.id}
              className={`relative rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col ${
                item.recommended ? 'border-violet-300 ring-1 ring-violet-200' : 'border-gray-200'
              }`}
            >
              {item.recommended && (
                <span className='absolute top-3 right-3 z-10 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-2 py-0.5 text-[10px] font-bold text-white shadow'>
                  <Star className='h-2.5 w-2.5 fill-current' />
                  Recommended
                </span>
              )}

              {/* Hero tile */}
              <div className={`relative aspect-[16/9] bg-gradient-to-br ${tileGradient} overflow-hidden`}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading='lazy'
                    className='w-full h-full object-contain p-4'
                  />
                ) : (
                  <>
                    {/* Decorative blobs */}
                    <div className='absolute -top-12 -left-8 h-40 w-40 rounded-full bg-white/15 blur-2xl' />
                    <div className='absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-black/10 blur-3xl' />
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='h-20 w-20 rounded-2xl bg-white/95 shadow-xl flex items-center justify-center backdrop-blur-sm'>
                        <Icon className='h-10 w-10 text-gray-800' />
                      </div>
                    </div>
                    {/* Vendor watermark */}
                    <span className='absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-widest text-white/70'>
                      {item.vendor.replace(' (via Amazon)', '')}
                    </span>
                  </>
                )}
              </div>

              <div className='p-4 flex-1 flex flex-col'>
                <div className='mb-3'>
                  <p className='text-[10px] uppercase font-bold text-gray-400 tracking-wide'>
                    {item.vendor}
                  </p>
                  <h3 className='text-sm font-bold text-gray-900 leading-tight'>{item.name}</h3>
                </div>

                <p className='text-xs text-gray-600 leading-relaxed mb-3'>{item.pitch}</p>

                <div className='space-y-1.5 mb-3'>
                  <p className='text-[10px] font-semibold text-gray-500 uppercase tracking-wide'>Works with</p>
                  <div className='flex flex-wrap gap-1'>
                    {item.works.slice(0, 4).map((w) => (
                      <span
                        key={w}
                        className='inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium'
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>

                {item.caveats && item.caveats.length > 0 && (
                  <div className='space-y-1 mb-3'>
                    {item.caveats.map((c) => (
                      <p
                        key={c}
                        className='text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1'
                      >
                        ⚠ {c}
                      </p>
                    ))}
                  </div>
                )}

                <div className='mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2'>
                  <div>
                    {item.priceUsd === 'free' ? (
                      <span className='text-base font-bold text-emerald-600'>FREE</span>
                    ) : (
                      <span className='text-base font-bold text-gray-900'>
                        ~${item.priceUsd}
                      </span>
                    )}
                    <p className='text-[10px] text-gray-400'>{item.bestFor}</p>
                  </div>

                  {item.inAppHref ? (
                    <Link
                      href={item.inAppHref}
                      className='shrink-0 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm'
                    >
                      <Sparkles className='h-3 w-3' />
                      Use Now
                    </Link>
                  ) : item.buyUrl ? (
                    <a
                      href={item.buyUrl}
                      target='_blank'
                      rel='noopener sponsored'
                      className='shrink-0 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm'
                    >
                      Buy
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <h3 className='text-sm font-bold text-gray-900 mb-1'>Want a setup recommendation?</h3>
        <p className='text-xs text-gray-600'>
          Most contractors do great with the <strong>NETUM 2D scanner</strong> + <strong>Brother QL-820NWB</strong>. About
          $260 total, plug in, done. For solo or occasional use, the phone camera scanner built into Property Flow HQ
          covers everything you need.
        </p>
      </div>
    </div>
  );
}
