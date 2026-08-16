'use client';

/**
 * PropertyGallery
 *
 * Zillow/Redfin-style image viewer for the public property page. The user
 * sees one large primary image with a thumbnail strip below. Clicking a
 * thumbnail or pressing the left/right arrow swaps the primary image in
 * place. Keyboard arrow keys also work for accessibility.
 *
 * Props:
 *   images: list of remote image URLs. Empty array renders a placeholder.
 *   alt: descriptive alt text used as a base for each frame.
 */

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Building2, Maximize2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface PropertyGalleryProps {
  images: string[];
  alt: string;
}

export default function PropertyGallery({ images, alt }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const total = images.length;

  const goPrev = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    if (total === 0) return;
    setActiveIndex((i) => (i + 1) % total);
  }, [total]);

  // Keyboard navigation. Only active when at least one image is loaded so
  // we don't grab arrow keys away from other controls on an empty page.
  useEffect(() => {
    if (total === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') setLightboxOpen(false);
        if (e.key === 'ArrowLeft') goPrev();
        if (e.key === 'ArrowRight') goNext();
        return;
      }
      // Don't capture arrows when typing in inputs
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext, total, lightboxOpen]);

  // Empty state — same placeholder the old design used so layouts stay aligned.
  if (total === 0) {
    return (
      <div className="h-96 w-full rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-2xl">
        <Building2 className="h-24 w-24 text-slate-300" />
      </div>
    );
  }

  const activeSrc = images[activeIndex];

  return (
    <div className="space-y-3">
      {/* Primary image */}
      <div
        className="relative aspect-[4/3] sm:h-[28rem] sm:aspect-auto w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xl group"
      >
        <Image
          src={activeSrc}
          alt={`${alt} — image ${activeIndex + 1} of ${total}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-opacity duration-200"
          priority={activeIndex === 0}
        />

        {/* Counter pill */}
        <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
          {activeIndex + 1} / {total}
        </div>

        {/* Expand button */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open full-screen view"
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          View larger
        </button>

        {/* Prev / Next — only show when there's more than one image */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 hover:bg-white shadow-lg transition focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="h-5 w-5 text-slate-900" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 hover:bg-white shadow-lg transition focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronRight className="h-5 w-5 text-slate-900" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails — horizontal strip that scrolls on small screens */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {images.map((src, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${src}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Show image ${idx + 1}`}
                aria-pressed={isActive}
                className={`relative flex-shrink-0 h-20 w-28 rounded-lg overflow-hidden border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'border-blue-600 shadow-md'
                    : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 hover:bg-white text-slate-900 shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative w-full max-w-6xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeSrc}
              alt={`${alt} — image ${activeIndex + 1} of ${total}`}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/90 hover:bg-white shadow-lg"
                >
                  <ChevronLeft className="h-6 w-6 text-slate-900" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/90 hover:bg-white shadow-lg"
                >
                  <ChevronRight className="h-6 w-6 text-slate-900" />
                </button>
              </>
            )}

            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
              {activeIndex + 1} / {total}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
