'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleMap, OverlayView, useJsApiLoader } from '@react-google-maps/api';
import {
  Clock,
  MapPin,
  RefreshCw,
  Users,
  AlertCircle,
  Briefcase,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type CrewMember = {
  entryId: string;
  employeeId: string | null;
  employeeName: string;
  employeePhoto: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  clockIn: string;
  elapsedMinutes: number;
  jobId: string | null;
  jobTitle: string | null;
  jobNumber: string | null;
};

interface CrewMapClientProps {
  businessName: string;
  subscriptionTier: string;
  googleMapsApiKey: string;
}

// Default map center when no crew has GPS yet — central US so a single
// data point or an empty state still looks reasonable. Once we have real
// coordinates, the map auto-fits to the actual bounds.
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 4;
const REFRESH_INTERVAL_MS = 30_000;

const formatElapsed = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const isEnterpriseRequired = false; // crew-map is included on all paid tiers; flip if you want to gate it

export function CrewMapClient({
  businessName,
  subscriptionTier,
  googleMapsApiKey,
}: CrewMapClientProps) {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useJsApiLoader({
    googleMapsApiKey,
    id: 'crew-map-loader',
  });

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/contractor/crew-locations', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { crew: CrewMember[]; count: number };
      setCrew(data.crew);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load crew locations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30s.
  useEffect(() => {
    load();
    const id = window.setInterval(load, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const crewWithLocation = useMemo(
    () => crew.filter((c) => c.lat !== null && c.lng !== null),
    [crew]
  );
  const crewWithoutLocation = useMemo(
    () => crew.filter((c) => c.lat === null || c.lng === null),
    [crew]
  );

  // Compute initial center: average of crew points, or default.
  const initialCenter = useMemo(() => {
    if (crewWithLocation.length === 0) return DEFAULT_CENTER;
    const sum = crewWithLocation.reduce(
      (acc, c) => ({ lat: acc.lat + (c.lat as number), lng: acc.lng + (c.lng as number) }),
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / crewWithLocation.length, lng: sum.lng / crewWithLocation.length };
  }, [crewWithLocation]);

  const initialZoom = crewWithLocation.length > 0 ? 11 : DEFAULT_ZOOM;

  // After the map loads or crew changes, fit the bounds to the crew points.
  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      if (crewWithLocation.length < 2) return;
      const bounds = new google.maps.LatLngBounds();
      crewWithLocation.forEach((c) => bounds.extend({ lat: c.lat as number, lng: c.lng as number }));
      map.fitBounds(bounds, 80);
    },
    [crewWithLocation]
  );

  if (!googleMapsApiKey) {
    return (
      <ConfigError
        title='Google Maps is not configured'
        body='Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment to enable the Live Crew Map.'
      />
    );
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='relative rounded-xl border-2 border-black shadow-xl overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600' />
        <div className='relative p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-2 text-white/90'>
              <MapPin className='h-5 w-5' />
              <span className='text-xs uppercase tracking-wide font-semibold'>Live Crew Map</span>
              {isEnterpriseRequired && (
                <Badge className='bg-amber-400 text-amber-950 border-amber-300'>
                  <Crown className='h-3 w-3 mr-1' /> Enterprise
                </Badge>
              )}
            </div>
            <h1 className='text-2xl sm:text-3xl font-bold text-white mt-1'>{businessName || 'Your Crew'}</h1>
            <p className='text-sm text-white/80'>
              {loading
                ? 'Loading current crew…'
                : `${crew.length} clocked-in · ${crewWithLocation.length} with GPS`}
              {lastUpdated && (
                <>
                  {' · '}
                  Updated {lastUpdated.toLocaleTimeString()}
                </>
              )}
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setLoading(true);
              load();
            }}
            className='bg-white/15 hover:bg-white/25 text-white border-white/30 self-start sm:self-auto'
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className='rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2'>
          <AlertCircle className='h-4 w-4 mt-0.5 flex-shrink-0' />
          <div>
            <div className='font-semibold'>Couldn&apos;t load crew locations</div>
            <div className='text-red-700/80'>{error}</div>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Map */}
        <div className='lg:col-span-2 rounded-xl border-2 border-black shadow-xl overflow-hidden bg-white'>
          {mapsLoadError ? (
            <ConfigError
              title='Map failed to load'
              body='Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is valid and that the Maps JavaScript API is enabled in Google Cloud Console.'
            />
          ) : !mapsLoaded ? (
            <div className='h-[480px] flex items-center justify-center text-sm text-gray-500'>
              Loading map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '480px' }}
              center={initialCenter}
              zoom={initialZoom}
              onLoad={onMapLoad}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
              }}
            >
              {crewWithLocation.map((member) => (
                <OverlayView
                  key={member.entryId}
                  position={{ lat: member.lat as number, lng: member.lng as number }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedId((id) => (id === member.entryId ? null : member.entryId))}
                    className='group -translate-x-1/2 -translate-y-full focus:outline-none'
                    aria-label={`${member.employeeName} on ${member.jobTitle ?? 'job'}`}
                  >
                    <div className='flex flex-col items-center gap-1'>
                      <div
                        className={`relative h-10 w-10 rounded-full border-4 shadow-lg flex items-center justify-center text-xs font-bold ${
                          selectedId === member.entryId
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : 'border-emerald-500 bg-white text-emerald-700'
                        }`}
                      >
                        {initials(member.employeeName)}
                        <span className='absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse' />
                      </div>
                      {selectedId === member.entryId && (
                        <div className='translate-y-0 mt-1 min-w-[180px] max-w-[240px] rounded-lg border-2 border-black bg-white shadow-xl text-left'>
                          <div className='p-2'>
                            <div className='text-xs font-bold text-gray-900 truncate'>
                              {member.employeeName}
                            </div>
                            {member.jobTitle && (
                              <div className='text-[10px] text-gray-600 truncate flex items-center gap-1'>
                                <Briefcase className='h-3 w-3' />
                                {member.jobNumber ? `#${member.jobNumber} · ` : ''}
                                {member.jobTitle}
                              </div>
                            )}
                            <div className='text-[10px] text-gray-600 flex items-center gap-1 mt-1'>
                              <Clock className='h-3 w-3' />
                              On clock {formatElapsed(member.elapsedMinutes)}
                            </div>
                            {member.address && (
                              <div className='text-[10px] text-gray-500 truncate mt-0.5'>
                                {member.address}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                </OverlayView>
              ))}
            </GoogleMap>
          )}
        </div>

        {/* Crew list */}
        <div className='space-y-3'>
          <div className='rounded-xl border-2 border-black shadow-xl overflow-hidden bg-white'>
            <div className='p-3 border-b-2 border-black/10 bg-gradient-to-r from-emerald-100 to-teal-100'>
              <div className='flex items-center gap-2'>
                <Users className='h-4 w-4 text-emerald-700' />
                <span className='text-sm font-bold text-gray-900'>Currently Clocked In</span>
                <Badge className='ml-auto bg-emerald-500 text-white border-emerald-600'>
                  {crew.length}
                </Badge>
              </div>
            </div>
            <div className='divide-y divide-gray-100 max-h-[420px] overflow-y-auto'>
              {loading && crew.length === 0 ? (
                <div className='p-6 text-center text-sm text-gray-500'>Loading crew…</div>
              ) : crew.length === 0 ? (
                <div className='p-6 text-center'>
                  <Users className='h-8 w-8 mx-auto text-gray-300 mb-2' />
                  <p className='text-sm text-gray-500'>No one is clocked in right now.</p>
                </div>
              ) : (
                crew.map((member) => {
                  const hasLocation = member.lat !== null && member.lng !== null;
                  return (
                    <button
                      type='button'
                      key={member.entryId}
                      onClick={() => setSelectedId(member.entryId)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                        selectedId === member.entryId ? 'bg-amber-50' : ''
                      }`}
                    >
                      <div className='flex items-start gap-3'>
                        <div className='h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center'>
                          {initials(member.employeeName)}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='text-sm font-semibold text-gray-900 truncate'>
                            {member.employeeName}
                          </div>
                          {member.jobTitle ? (
                            <div className='text-xs text-gray-600 truncate'>
                              {member.jobNumber ? `#${member.jobNumber} · ` : ''}
                              {member.jobTitle}
                            </div>
                          ) : (
                            <div className='text-xs text-gray-400'>No job linked</div>
                          )}
                          <div className='flex items-center gap-2 mt-1 text-[11px] text-gray-500'>
                            <span className='flex items-center gap-1'>
                              <Clock className='h-3 w-3' />
                              {formatElapsed(member.elapsedMinutes)}
                            </span>
                            {hasLocation ? (
                              <Badge className='bg-emerald-100 text-emerald-700 border-emerald-200'>
                                <MapPin className='h-3 w-3 mr-1' />
                                GPS
                              </Badge>
                            ) : (
                              <Badge className='bg-gray-100 text-gray-600 border-gray-200'>
                                No GPS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {crewWithoutLocation.length > 0 && (
            <div className='rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800'>
              <div className='font-semibold mb-0.5'>
                {crewWithoutLocation.length} crew member
                {crewWithoutLocation.length === 1 ? '' : 's'} without GPS
              </div>
              <div className='text-amber-700'>
                They&apos;re clocked in but didn&apos;t share location at clock-in. They&apos;ll show up
                here without a map pin.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

function ConfigError({ title, body }: { title: string; body: string }) {
  return (
    <div className='rounded-xl border-2 border-amber-300 bg-amber-50 p-6 text-sm text-amber-800'>
      <div className='font-bold mb-1'>{title}</div>
      <div className='text-amber-700/80'>{body}</div>
    </div>
  );
}
