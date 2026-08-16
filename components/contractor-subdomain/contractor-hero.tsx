'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { CheckCircle2, MapPin, Calendar, Star, Phone, Mail } from 'lucide-react';
import { ContractorQuoteButton } from '@/components/contractor/quote-button';

interface ContractorSubdomainHeroProps {
  brandName: string;
  tagline?: string | null;
  brandEmail?: string | null;
  brandPhone?: string | null;
  baseCity?: string | null;
  baseState?: string | null;
  heroMedia: string[];
  subdomain: string;
  slug: string;
  specialties?: string[];
  contractorId?: string;
  contractorImage?: string | null;
  isAvailable?: boolean;
  avgRating?: number;
  totalReviews?: number;
}

export default function ContractorSubdomainHero({
  brandName,
  tagline,
  brandEmail,
  brandPhone,
  baseCity,
  baseState,
  heroMedia,
  subdomain,
  slug,
  specialties = [],
  contractorId,
  contractorImage,
  isAvailable = true,
  avgRating = 0,
  totalReviews = 0,
}: ContractorSubdomainHeroProps) {
  const location = [baseCity, baseState].filter(Boolean).join(', ');
  
  return (
    <div className="relative w-full overflow-hidden">
      {/* Hero Background with Image */}
      <div className="relative w-full min-h-[600px] md:min-h-[700px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <HeroImageBackground heroMedia={heroMedia} brandName={brandName} />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-16 pb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Contractor Image & Status */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-1">
                    <div className="h-full w-full rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
                      {contractorImage ? (
                        <Image src={contractorImage} alt={brandName} width={76} height={76} className="rounded-xl object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-white">{brandName.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-slate-900 ${isAvailable ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                </div>
                <div>
                  <p className="text-xs tracking-[0.25em] uppercase text-violet-300 font-semibold">Professional Contractor</p>
                  {isAvailable && (
                    <p className="text-sm text-emerald-400 font-medium flex items-center gap-1 mt-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Available Now
                    </p>
                  )}
                </div>
              </div>

              {/* Name & Rating */}
              <div>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-white via-violet-100 to-white bg-clip-text text-transparent mb-3">
                  {brandName}
                </h1>
                {totalReviews > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= avgRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-white font-semibold">{avgRating.toFixed(1)}</span>
                    <span className="text-slate-400">({totalReviews} reviews)</span>
                  </div>
                )}
              </div>

              {/* Tagline */}
              <p className="text-lg text-slate-200 leading-relaxed">
                {tagline || `Quality workmanship, reliable service, and professional results.`}
              </p>

              {/* Location */}
              {location && (
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="h-5 w-5 text-violet-400" />
                  <span className="font-medium">{location}</span>
                </div>
              )}

              {/* Specialties */}
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {specialties.slice(0, 5).map((specialty) => (
                    <div key={specialty} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-sm text-white font-medium">{specialty}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href={`/${subdomain}/schedule`} className="flex-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-5 w-5" />
                    Instant Booking
                  </motion.button>
                </Link>
                <div className="flex-1">
                  <ContractorQuoteButton
                    contractorSlug={slug}
                    contractorName={brandName}
                  />
                </div>
              </div>

              {/* Quick Contact */}
              <div className="flex items-center gap-4 pt-2">
                {brandPhone && (
                  <a
                    href={`tel:${brandPhone}`}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">{brandPhone}</span>
                  </a>
                )}
                {brandEmail && (
                  <a
                    href={`mailto:${brandEmail}`}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Email</span>
                  </a>
                )}
              </div>
            </motion.div>

            {/* Right Column - Image Gallery */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="hidden md:block"
            >
              <HeroImageGallery heroMedia={heroMedia} brandName={brandName} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}


// Background image with parallax effect
function HeroImageBackground({ heroMedia, brandName }: { heroMedia: string[]; brandName: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (heroMedia.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % heroMedia.length);
    }, 6000);
    return () => clearInterval(t);
  }, [heroMedia.length]);

  if (!heroMedia.length) {
    return <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />;
  }

  return (
    <>
      {heroMedia.map((src, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: index === i ? 1 : 0 }}
          transition={{ duration: 1.5 }}
        >
          <Image
            src={src}
            alt={`${brandName} work ${i + 1}`}
            fill
            priority={i === 0}
            className="object-cover"
          />
        </motion.div>
      ))}
    </>
  );
}

// Gallery grid for desktop
function HeroImageGallery({ heroMedia, brandName }: { heroMedia: string[]; brandName: string }) {
  if (!heroMedia.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-200/90">
        <p>Portfolio images coming soon.</p>
      </div>
    );
  }

  const displayImages = heroMedia.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-4">
      {displayImages.map((src, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className={`relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${
            i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
          }`}
        >
          <Image
            src={src}
            alt={`${brandName} work ${i + 1}`}
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
          />
        </motion.div>
      ))}
    </div>
  );
}
