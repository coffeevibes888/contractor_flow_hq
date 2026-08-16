'use client';
import { useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import ProductPrice from '@/components/shared/product/product-price';
import ProductImages from '@/components/shared/product/product-images';
import Rating from '@/components/shared/product/rating';

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string;
  rating: number;
  numReviews: number;
  price: number;
  stock: number;
  images: string[];
  imageColors?: string[];
  bedrooms?: unknown;
  bathrooms?: unknown;
  sizeSqFt?: unknown;
};

export default function ProductDetailClient({
  product,
}: {
  product: Product;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  // Derive subdomain from pathname (e.g., /landlord-slug/properties/... -> landlord-slug)
  const subdomain = pathname.split('/')[1] || '';

  const baseImages = useMemo(() => product.images || [], [product.images]);
  const [activeImage, setActiveImage] = useState<string>(baseImages[0] || '');

  // Combine all unique images for thumbnails
  const allImages = useMemo(() => {
    const imagesSet = new Set(baseImages);
    return Array.from(imagesSet);
  }, [baseImages]);

  // Handle thumbnail click
  const handleImageChange = useCallback((url?: string) => {
    if (url) setActiveImage(url);
  }, []);

  const toNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
    const asStringValue = (value as { toString?: () => string }).toString?.() ?? String(value);
    const parsed = Number(asStringValue);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const bedrooms = toNumber(product.bedrooms);
  const bathrooms = toNumber(product.bathrooms);
  const sizeSqFt = toNumber(product.sizeSqFt);

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Images Column */}
        <div className="col-span-2">
          <ProductImages
            images={allImages}
            activeImage={activeImage}
            onImageClick={handleImageChange}
          />
        </div>

        {/* Details Column */}
        <div className="col-span-2 p-5 space-y-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {product.category} · {product.brand}
            </p>
            <h1 className="h3-bold text-slate-900">{product.name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Rating value={Number(product.rating)} />
              <span>{product.numReviews} reviews</span>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-700">
              <div className="flex items-center gap-3">
                {bedrooms != null && bedrooms >= 0 && <span>{bedrooms} bd</span>}
                {bathrooms != null && bathrooms >= 0 && <span>{bathrooms} ba</span>}
                {sizeSqFt != null && sizeSqFt > 0 && (
                  <span>{sizeSqFt.toLocaleString()} sqft</span>
                )}
              </div>
              <div className="text-right">
                <ProductPrice
                  value={Number(product.price)}
                  className="text-lg font-semibold text-slate-900"
                />
                <span className="block text-[11px] text-slate-500">per month</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="font-semibold text-sm text-slate-900">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
          </div>
        </div>

        {/* Action Column */}
        <div>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">Monthly rent</span>
                <ProductPrice value={Number(product.price)} className="text-lg font-semibold" />
              </div>
              <button
                className="w-full rounded-full bg-slate-900 text-white text-sm py-2.5 hover:bg-slate-800 transition-colors"
                onClick={() => {
                  const subdomainPrefix = subdomain ? `/${subdomain}` : '';
                  if (!session || session.user?.role !== 'tenant') {
                    // Redirect to subdomain sign-up with application intent
                    window.location.href = `${subdomainPrefix}/sign-up?fromProperty=true&propertySlug=${encodeURIComponent(product.slug)}`;
                  } else {
                    // User is already a tenant, go directly to application
                    window.location.href = `${subdomainPrefix}/application?property=${encodeURIComponent(product.slug)}`;
                  }
                }}
              >
                Start Application
              </button>
              <p className="text-[11px] text-slate-500">
                You&apos;ll be asked for your contact details, current address, employer, and SSN.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

