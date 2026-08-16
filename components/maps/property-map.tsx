'use client';

import { MapPin } from 'lucide-react';

interface PropertyMapProps {
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  propertyName?: string;
  className?: string;
}

/**
 * Renders a Google Maps embed for a single property address.
 *
 * We use Google's Maps Embed API (`/maps/embed/v1/place`) when an API key is
 * available — it's a single iframe with no JS SDK / Geocoder dependency, so
 * it works regardless of HTTP referrer restrictions on the JS Maps API or
 * which APIs are enabled in the Google Cloud project. If the key is missing
 * we fall back to the keyless `maps.google.com/maps?q=...&output=embed`
 * iframe, which still renders an interactive map. Either way we always show
 * a "View on Google Maps" CTA underneath for users who want full directions.
 */
export default function PropertyMap({ address, propertyName, className = '' }: PropertyMapProps) {
  const fullAddress = [address.street, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(', ');

  if (!fullAddress) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden border border-white/10 bg-slate-900/60 flex items-center justify-center p-6 text-center ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-slate-300 text-sm">
          <MapPin className="h-8 w-8 text-violet-400" />
          No address available for this property.
        </div>
      </div>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const encoded = encodeURIComponent(fullAddress);

  // Embed URL — keyed embed when available (better tile quality, no extra
  // call-out), keyless `output=embed` as a universal fallback. Both render
  // an interactive Google map.
  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encoded}`
    : `https://www.google.com/maps?q=${encoded}&output=embed`;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-white/10 ${className}`}>
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: '300px', display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        title={`Map of ${propertyName || 'property'}`}
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-violet-500/95 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-violet-400 transition-colors backdrop-blur"
      >
        <MapPin className="h-3.5 w-3.5" />
        View on Google Maps
      </a>
    </div>
  );
}
