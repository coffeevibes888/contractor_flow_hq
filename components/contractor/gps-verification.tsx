'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Navigation,
  Map
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GPSVerificationProps {
  milestoneId: string;
  jobAddress?: string;
  requiredLocation?: {
    lat: number;
    lng: number;
    radius?: number; // meters
  };
  onVerified: (location: { lat: number; lng: number; address: string }) => void;
}

export function GPSVerification({
  milestoneId,
  jobAddress,
  requiredLocation,
  onVerified
}: GPSVerificationProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    accuracy: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const captureLocation = async () => {
    setIsCapturing(true);
    setError(null);

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Request location with high accuracy
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Reverse geocode to get address
      const address = await reverseGeocode(latitude, longitude);

      setLocation({
        lat: latitude,
        lng: longitude,
        address,
        accuracy
      });

      toast({
        description: '📍 Location captured successfully!'
      });
    } catch (err) {
      const errorMessage = err instanceof GeolocationPositionError
        ? getGeolocationErrorMessage(err)
        : err instanceof Error
        ? err.message
        : 'Failed to capture location';

      setError(errorMessage);
      toast({
        variant: 'destructive',
        description: errorMessage
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get address');
      }

      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access in your browser settings.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable. Please try again.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'An unknown error occurred while getting your location.';
    }
  };

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    // Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const verifyLocation = async () => {
    if (!location) return;

    setIsVerifying(true);

    try {
      // Check if within required radius
      if (requiredLocation) {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          requiredLocation.lat,
          requiredLocation.lng
        );

        const radius = requiredLocation.radius || 100; // Default 100m radius

        if (distance > radius) {
          throw new Error(
            `You must be within ${radius}m of the job site. Current distance: ${Math.round(distance)}m`
          );
        }
      }

      // Submit to API
      const response = await fetch(`/api/milestones/${milestoneId}/verify-gps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          address: location.address,
          accuracy: location.accuracy
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify location');
      }

      toast({
        description: '✅ GPS verification successful!'
      });

      onVerified({
        lat: location.lat,
        lng: location.lng,
        address: location.address
      });
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to verify location'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          GPS Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Job Address */}
        {jobAddress && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Job Site Address:</p>
            <p className="font-medium text-gray-900">{jobAddress}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>Instructions:</strong> Click the button below to capture your current location.
            Make sure you are at the job site before verifying.
          </p>
          {requiredLocation && (
            <p className="text-xs text-gray-600 mt-2">
              You must be within {requiredLocation.radius || 100} meters of the job site.
            </p>
          )}
        </div>

        {/* Capture Button */}
        {!location && (
          <Button
            onClick={captureLocation}
            disabled={isCapturing}
            className="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
          >
            {isCapturing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Capturing Location...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                Capture My Location
              </>
            )}
          </Button>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Location Display */}
        {location && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-900 mb-2">
                    Location Captured
                  </p>
                  <div className="space-y-1 text-sm text-emerald-800">
                    <p>
                      <strong>Coordinates:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                    <p>
                      <strong>Address:</strong> {location.address}
                    </p>
                    <p>
                      <strong>Accuracy:</strong> ±{Math.round(location.accuracy)}m
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Preview */}
            <div className="relative h-48 rounded-lg overflow-hidden border-2 border-gray-200">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.01},${location.lng + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lng}`}
                style={{ border: 0 }}
              />
              <div className="absolute top-2 right-2">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded shadow text-xs text-blue-600 hover:text-blue-700"
                >
                  <Map className="h-3 w-3" />
                  View Larger Map
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLocation(null);
                  setError(null);
                }}
                className="flex-1 border-2 border-gray-300"
              >
                Recapture
              </Button>
              <Button
                onClick={verifyLocation}
                disabled={isVerifying}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verify Location
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Browser Compatibility Note */}
        <div className="text-xs text-gray-500 text-center">
          <p>
            GPS verification requires location access. Make sure location services are enabled
            on your device and browser.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
