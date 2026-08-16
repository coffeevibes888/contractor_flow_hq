/**
 * Google Maps Street View Image Utility
 *
 * Generates Street View image URLs for property addresses
 */

/**
 * Generate a Google Maps Street View image URL for a given address
 * @param address - Full street address
 * @param city - City name
 * @param state - State abbreviation
 * @param size - Image size in format "widthxheight" (default: "400x400")
 * @returns Street View image URL or null if no API key
 */
export function getStreetViewImageUrl(
  address: string | null,
  city: string | null,
  state: string | null,
  size: string = '400x400'
): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Maps API key not found');
    return null;
  }

  if (!address || !city || !state) {
    return null;
  }

  // Construct full address
  const fullAddress = `${address}, ${city}, ${state}`;
  const encodedAddress = encodeURIComponent(fullAddress);

  // Google Street View Static API URL
  // https://developers.google.com/maps/documentation/streetview/request-streetview
  // Added heading=0 for front-facing view and source=outdoor to prefer outdoor imagery
  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodedAddress}&key=${apiKey}&fov=80&pitch=0&heading=0&source=outdoor`;

  return streetViewUrl;
}

/**
 * Generate a Google Maps Static Map image URL for a given address (fallback)
 * @param address - Full street address
 * @param city - City name
 * @param state - State abbreviation
 * @param size - Image size in format "widthxheight" (default: "400x400")
 * @param zoom - Zoom level (default: 17)
 * @returns Static Map image URL or null if no API key
 */
export function getStaticMapImageUrl(
  address: string | null,
  city: string | null,
  state: string | null,
  size: string = '400x400',
  zoom: number = 17
): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  if (!address || !city || !state) {
    return null;
  }

  // Construct full address
  const fullAddress = `${address}, ${city}, ${state}`;
  const encodedAddress = encodeURIComponent(fullAddress);

  // Google Static Maps API URL
  // https://developers.google.com/maps/documentation/maps-static/start
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=${zoom}&size=${size}&maptype=satellite&key=${apiKey}`;

  return staticMapUrl;
}

// Made with Bob
