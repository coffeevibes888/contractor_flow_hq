'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, MapPin, Bed, Bath, Square, Grid3X3, List, Map as MapIcon, 
  SlidersHorizontal, X, ChevronDown, Video, View, Heart,
  Home, Building2, DoorOpen, Castle
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import NoListingsModal from '@/components/no-listings-modal';

interface Listing {
  id: string;
  propertyId: string | null;
  propertyName: string;
  propertySlug: string;
  unitName: string | null;
  type: string;
  bedrooms: number | null;
  bedroomRange: { min: number; max: number } | null;
  bathrooms: number | null;
  sizeSqFt: number | null;
  price: number;
  priceRange: { min: number; max: number } | null;
  rentAmount: number | null;
  images: string[];
  amenities: string[];
  availableFrom: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    lat: number | null;
    lng: number | null;
  };
  landlord: { name: string; subdomain: string } | null;
  agent: { id: string; name: string; subdomain: string; brokerage: string | null; image: string | null } | null;
  hasVideo: boolean;
  hasVirtualTour: boolean;
  listingType: 'sale' | 'rent';
  source: 'property' | 'agent';
  isApartmentComplex?: boolean;
  unitCount?: number;
}

interface ListingsClientProps {
  initialData: {
    listings: Listing[];
    filters: {
      cities: string[];
      minPrice: number;
      maxPrice: number;
    };
    total: number;
  };
  searchParams: {
    minPrice?: string;
    maxPrice?: string;
    bedrooms?: string;
    bathrooms?: string;
    type?: string;
    city?: string;
    q?: string;
    view?: string;
    listingType?: string;
  };
}

const propertyTypes = [
  { value: 'all', label: 'All Types', icon: Home },
  { value: 'apartment', label: 'Apartment', icon: Building2 },
  { value: 'room', label: 'Room', icon: DoorOpen },
  { value: 'house', label: 'House', icon: Castle },
];

const bedroomOptions = [
  { value: 'any', label: 'Any' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bed' },
  { value: '2', label: '2 Beds' },
  { value: '3', label: '3 Beds' },
  { value: '4+', label: '4+ Beds' },
];

const bathroomOptions = [
  { value: 'any', label: 'Any' },
  { value: '1', label: '1 Bath' },
  { value: '1.5', label: '1.5 Baths' },
  { value: '2', label: '2 Baths' },
  { value: '3+', label: '3+ Baths' },
];

export default function ListingsClient({ initialData, searchParams }: ListingsClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>(
    (searchParams.view as 'grid' | 'list' | 'map') || 'grid'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.q || '');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Filter states
  const [filters, setFilters] = useState({
    minPrice: searchParams.minPrice || '',
    maxPrice: searchParams.maxPrice || '',
    bedrooms: searchParams.bedrooms || 'any',
    bathrooms: searchParams.bathrooms || 'any',
    type: searchParams.type || 'all',
    city: searchParams.city || 'all',
    listingType: searchParams.listingType || 'all',
  });

  const { listings, filters: filterOptions, total } = initialData;

  // Build URL with filters
  const applyFilters = useCallback((overrides?: Partial<typeof filters>) => {
    const merged = { ...filters, ...overrides };
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (merged.minPrice) params.set('minPrice', merged.minPrice);
    if (merged.maxPrice) params.set('maxPrice', merged.maxPrice);
    if (merged.bedrooms !== 'any') params.set('bedrooms', merged.bedrooms);
    if (merged.bathrooms !== 'any') params.set('bathrooms', merged.bathrooms);
    if (merged.type !== 'all') params.set('type', merged.type);
    if (merged.city !== 'all') params.set('city', merged.city);
    if (merged.listingType !== 'all') params.set('listingType', merged.listingType);
    if (viewMode !== 'grid') params.set('view', viewMode);
    
    router.push(`/listings?${params.toString()}`);
  }, [filters, searchQuery, viewMode, router]);

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      bedrooms: 'any',
      bathrooms: 'any',
      type: 'all',
      city: 'all',
      listingType: 'all',
    });
    setSearchQuery('');
    router.push('/listings');
  };

  const hasActiveFilters = 
    filters.minPrice || 
    filters.maxPrice || 
    filters.bedrooms !== 'any' || 
    filters.bathrooms !== 'any' || 
    filters.type !== 'all' || 
    filters.city !== 'all' ||
    filters.listingType !== 'all' ||
    searchQuery;

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getTypeIcon = (type: string) => {
    const found = propertyTypes.find(t => t.value === type);
    return found?.icon || Home;
  };

  return (
    <div className="min-h-screen">
      {/* No Listings Modal - shows when there are no listings */}
      <NoListingsModal show={listings.length === 0} />
      
      {/* Hero Search Section */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-sky-700 bg-clip-text text-transparent">
            Find Your Perfect Home
          </h1>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto font-medium">
            Browse {total} available properties in Las Vegas. Search by location, price, and amenities.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="border-2 border-slate-400 rounded-2xl shadow-2xl p-2">
              {/* Mobile: Search input full width, buttons below */}
              <div className="flex flex-col gap-2 md:hidden">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 " />
                  <Input
                    type="text"
                    placeholder="Search location, property..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    className="pl-12 h-12 text-base border-2 border-slate-400 bg-white text-slate-900 font-semibold placeholder:text-slate-500 placeholder:font-normal"
                  />
                </div>
                <div className="flex gap-2">
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="surface" className="h-11 flex-1 gap-2 font-bold">
                        <SlidersHorizontal className="h-5 w-5" />
                        Filters
                        {hasActiveFilters && (
                          <Badge className="ml-1 bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 text-white border-none font-bold">!</Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center justify-between">
                          Filters
                          {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                              Clear All
                            </Button>
                          )}
                        </SheetTitle>
                      </SheetHeader>
                      <FilterPanel 
                        filters={filters} 
                        setFilters={setFilters} 
                        filterOptions={filterOptions}
                        onApply={() => { applyFilters(); setShowFilters(false); }}
                      />
                    </SheetContent>
                  </Sheet>
                  <Button 
                    variant="brand"
                    className="h-11 flex-1 font-bold"
                    onClick={() => applyFilters()}
                  >
                    Search
                  </Button>
                </div>
              </div>

              {/* Desktop: Original horizontal layout */}
              <div className="hidden md:flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by location, property name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    className="pl-12 h-14 text-lg border-2 border-slate-400 bg-white text-slate-900 font-semibold placeholder:text-slate-500 placeholder:font-normal"
                  />
                </div>
                <div className="flex gap-2">
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="surface" size="lg" className="h-14 px-6 gap-2 font-bold">
                        <SlidersHorizontal className="h-5 w-5" />
                        <span>Filters</span>
                        {hasActiveFilters && (
                          <Badge className="ml-1 bg-gradient-to-r from-cyan-600 via-blue-500 to-violet-600 text-white border-none font-bold">!</Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center justify-between">
                          Filters
                          {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                              Clear All
                            </Button>
                          )}
                        </SheetTitle>
                      </SheetHeader>
                      <FilterPanel 
                        filters={filters} 
                        setFilters={setFilters} 
                        filterOptions={filterOptions}
                        onApply={() => { applyFilters(); setShowFilters(false); }}
                      />
                    </SheetContent>
                  </Sheet>
                  <Button 
                    size="lg" 
                    variant="brand"
                    className="h-14 px-8 font-bold"
                    onClick={() => applyFilters()}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div className="sticky top-0 z-40 backdrop-blur-sm border-b border-black shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile: Dropdown for property types */}
            <div className="flex items-center gap-2 md:hidden">
              {/* Buy/Rent Toggle - Compact on mobile */}
              <div className="flex gap-2">
                <Button
                  variant={filters.listingType === 'all' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="px-3 h-9 font-bold"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, listingType: 'all' }));
                    applyFilters({ listingType: 'all' });
                  }}
                >
                  All
                </Button>
                <Button
                  variant={filters.listingType === 'sale' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="px-3 h-9 font-bold"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, listingType: 'sale' }));
                    applyFilters({ listingType: 'sale' });
                  }}
                >
                  Buy
                </Button>
                <Button
                  variant={filters.listingType === 'rent' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="px-3 h-9 font-bold"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, listingType: 'rent' }));
                    applyFilters({ listingType: 'rent' });
                  }}
                >
                  Rent
                </Button>
              </div>
              
              {/* Property Type Dropdown for Mobile */}
              <Select
                value={filters.type}
                onValueChange={(value) => {
                  setFilters(prev => ({ ...prev, type: value }));
                  applyFilters({ type: value });
                }}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: Horizontal buttons */}
            <div className="hidden md:flex items-center gap-2">
              {/* Buy/Rent Toggle */}
              <div className="flex gap-2 mr-2">
                <Button
                  variant={filters.listingType === 'all' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="px-4 font-bold"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, listingType: 'all' }));
                    applyFilters({ listingType: 'all' });
                  }}
                >
                  All
                </Button>
                <Button
                  variant={filters.listingType === 'sale' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="px-4 font-bold"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, listingType: 'sale' }));
                    applyFilters({ listingType: 'sale' });
                  }}
                >
                  Buy
                </Button>
                <Button
                  variant={filters.listingType === 'rent' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="px-4 font-bold"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, listingType: 'rent' }));
                    applyFilters({ listingType: 'rent' });
                  }}
                >
                  Rent
                </Button>
              </div>
              
              {propertyTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={filters.type === type.value ? 'brand' : 'brandOutline'}
                    size="sm"
                    className="whitespace-nowrap gap-2 font-bold"
                    onClick={() => {
                      setFilters(prev => ({ ...prev, type: type.value }));
                      applyFilters({ type: type.value });
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="font-bold"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="font-bold"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'brand' : 'brandOutline'}
                  size="sm"
                  className="font-bold"
                  onClick={() => setViewMode('map')}
                >
                  <MapIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setSearchQuery(''); applyFilters(); }} />
              </Badge>
            )}
            {filters.city !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                City: {filters.city}
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilters(p => ({...p, city: 'all'})); }} />
              </Badge>
            )}
            {filters.type !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Type: {filters.type}
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilters(p => ({...p, type: 'all'})); }} />
              </Badge>
            )}
            {filters.listingType !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {filters.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilters(p => ({...p, listingType: 'all'})); }} />
              </Badge>
            )}
            {filters.bedrooms !== 'any' && (
              <Badge variant="secondary" className="gap-1">
                {filters.bedrooms === '0' ? 'Studio' : `${filters.bedrooms} Bed`}
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilters(p => ({...p, bedrooms: 'any'})); }} />
              </Badge>
            )}
            {filters.bathrooms !== 'any' && (
              <Badge variant="secondary" className="gap-1">
                {filters.bathrooms} Bath
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilters(p => ({...p, bathrooms: 'any'})); }} />
              </Badge>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <Badge variant="secondary" className="gap-1">
                ${filters.minPrice || '0'} - ${filters.maxPrice || '∞'}
                <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilters(p => ({...p, minPrice: '', maxPrice: ''})); }} />
              </Badge>
            )}
            <Button variant="surface" size="sm" onClick={clearFilters} className="font-bold">
              Clear all
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {viewMode === 'map' ? (
          <MapView listings={listings} formatPrice={formatPrice} />
        ) : (
          <>
            {listings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Home className="h-12 w-12 text-slate-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No properties found</h2>
                <p className="text-slate-500 mb-6">Try adjusting your filters or search criteria</p>
                <Button variant="surface" onClick={clearFilters} className="font-bold">Clear Filters</Button>
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'flex flex-col gap-4'
              )}>
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    viewMode={viewMode}
                    formatPrice={formatPrice}
                    isFavorite={favorites.has(listing.id)}
                    onToggleFavorite={() => toggleFavorite(listing.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Filter Panel Component
function FilterPanel({ 
  filters, 
  setFilters, 
  filterOptions,
  onApply 
}: { 
  filters: any; 
  setFilters: (fn: any) => void;
  filterOptions: { cities: string[]; minPrice: number; maxPrice: number };
  onApply: () => void;
}) {
  return (
    <div className="space-y-6 py-6">
      {/* Price Range */}
      <div>
        <label className="text-sm font-medium mb-3 block">Price Range</label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="number"
              placeholder={`Min ($${filterOptions.minPrice})`}
              value={filters.minPrice}
              onChange={(e) => setFilters((p: any) => ({ ...p, minPrice: e.target.value }))}
              className="border-2 border-black bg-white"
            />
          </div>
          <span className="self-center text-slate-400">-</span>
          <div className="flex-1">
            <Input
              type="number"
              placeholder={`Max ($${filterOptions.maxPrice})`}
              value={filters.maxPrice}
              onChange={(e) => setFilters((p: any) => ({ ...p, maxPrice: e.target.value }))}
              className="border-2 border-black bg-white"
            />
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>${filterOptions.minPrice}/mo</span>
          <span>${filterOptions.maxPrice}/mo</span>
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="text-sm font-medium mb-3 block">Bedrooms</label>
        <div className="grid grid-cols-3 gap-2">
          {bedroomOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filters.bedrooms === opt.value ? 'brand' : 'surface'}
              size="sm"
              className="font-bold"
              onClick={() => setFilters((p: any) => ({ ...p, bedrooms: opt.value }))}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Bathrooms */}
      <div>
        <label className="text-sm font-medium mb-3 block">Bathrooms</label>
        <div className="grid grid-cols-3 gap-2">
          {bathroomOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filters.bathrooms === opt.value ? 'brand' : 'surface'}
              size="sm"
              className="font-bold"
              onClick={() => setFilters((p: any) => ({ ...p, bathrooms: opt.value }))}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="text-sm font-medium mb-3 block">Property Type</label>
        <Select
          value={filters.type}
          onValueChange={(value) => setFilters((p: any) => ({ ...p, type: value }))}
        >
          <SelectTrigger className="border-2 border-black bg-white">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {propertyTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City */}
      <div>
        <label className="text-sm font-medium mb-3 block">City</label>
        <Select
          value={filters.city}
          onValueChange={(value) => setFilters((p: any) => ({ ...p, city: value }))}
        >
          <SelectTrigger className="border-2 border-black bg-white">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {filterOptions.cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="brand" className="w-full font-bold" onClick={onApply}>
        Apply Filters
      </Button>
    </div>
  );
}

// Listing Card Component
function ListingCard({ 
  listing, 
  viewMode, 
  formatPrice,
  isFavorite,
  onToggleFavorite
}: { 
  listing: Listing; 
  viewMode: 'grid' | 'list';
  formatPrice: (price: number) => string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const mainImage = listing.images[0] || null;
  const propertyUrl = listing.source === 'agent' 
    ? `/${listing.agent?.subdomain}/listings/${listing.propertySlug}`
    : listing.landlord?.subdomain 
      ? `/${listing.landlord.subdomain}/properties/${listing.propertySlug}`
      : `/properties/${listing.propertySlug}`;
  
  const priceLabel = listing.listingType === 'rent' ? '/mo' : '';
  const isComplex = listing.isApartmentComplex;
  
  // Format price display for apartment complexes
  const priceDisplay = isComplex && listing.priceRange
    ? `${formatPrice(listing.priceRange.min)} - ${formatPrice(listing.priceRange.max)}`
    : formatPrice(listing.price);
  
  // Format bedroom display for apartment complexes
  const bedroomDisplay = isComplex && listing.bedroomRange
    ? `${listing.bedroomRange.min === 0 ? 'Studio' : listing.bedroomRange.min} - ${listing.bedroomRange.max}`
    : listing.bedrooms !== null 
      ? (listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms}`)
      : null;
  
  if (viewMode === 'list') {
    return (
      <Link href={propertyUrl}>
        <Card className="overflow-hidden bg-white border border-black shadow-2xl hover:shadow-2xl transition-all cursor-pointer">
          <div className="flex flex-col md:flex-row">
            <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 bg-slate-100">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={listing.propertyName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Home className="h-10 w-10 opacity-40" />
                  <span className="text-xs font-medium">No photos yet</span>
                </div>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
                className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <Heart className={cn('h-5 w-5', isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-600')} />
              </button>
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className={listing.listingType === 'rent' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}>
                  {listing.listingType === 'rent' ? 'For Rent' : 'For Sale'}
                </Badge>
                {isComplex && (
                  <Badge className="bg-violet-600 text-white">
                    Apartment Community
                  </Badge>
                )}
              </div>
              {(listing.hasVideo || listing.hasVirtualTour) && (
                <div className="absolute bottom-3 left-3 flex gap-2">
                  {listing.hasVideo && (
                    <Badge className="bg-black/70 text-white gap-1">
                      <Video className="h-3 w-3" /> Video
                    </Badge>
                  )}
                  {listing.hasVirtualTour && (
                    <Badge className="bg-black/70 text-white gap-1">
                      <View className="h-3 w-3" /> 3D Tour
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <CardContent className="flex-1 p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors">
                    {listing.propertyName}{listing.unitName ? ` - ${listing.unitName}` : ''}
                  </h3>
                  <p className="text-slate-500 flex items-center gap-1 text-sm">
                    <MapPin className="h-4 w-4" />
                    {listing.address.street}, {listing.address.city}, {listing.address.state}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{priceDisplay}</p>
                  {priceLabel && <p className="text-sm text-slate-500">{priceLabel}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                {bedroomDisplay && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" /> {bedroomDisplay} {isComplex && listing.bedroomRange ? 'Beds' : (listing.bedrooms === 1 ? 'Bed' : 'Beds')}
                  </span>
                )}
                {!isComplex && listing.bathrooms !== null && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" /> {listing.bathrooms} {listing.bathrooms === 1 ? 'Bath' : 'Baths'}
                  </span>
                )}
                {!isComplex && listing.sizeSqFt && (
                  <span className="flex items-center gap-1">
                    <Square className="h-4 w-4" /> {listing.sizeSqFt.toLocaleString()} sqft
                  </span>
                )}
                {isComplex && listing.unitCount && (
                  <span className="flex items-center gap-1 text-violet-600 font-medium">
                    <Building2 className="h-4 w-4" /> {listing.unitCount} units available
                  </span>
                )}
                <Badge variant="outline" className="capitalize">{listing.type}</Badge>
              </div>
              {listing.agent && (
                <p className="text-sm text-slate-500 mb-2">
                  Listed by {listing.agent.name}{listing.agent.brokerage ? ` • ${listing.agent.brokerage}` : ''}
                </p>
              )}
              {listing.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {listing.amenities.slice(0, 5).map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                  {listing.amenities.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{listing.amenities.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </Link>
    );
  }

  // Grid view
  return (
    <Link href={propertyUrl}>
      <Card className="overflow-hidden bg-white border border-black shadow-2xl hover:shadow-2xl transition-all hover:-translate-y-1 group cursor-pointer h-full">
        <div className="relative aspect-[4/3] bg-slate-100">
          {mainImage ? (
            <>
              <Image
                src={mainImage}
                alt={listing.propertyName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Home className="h-16 w-16 opacity-30" />
              <span className="text-sm font-medium">No photos yet</span>
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-10"
          >
            <Heart className={cn('h-5 w-5', isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-600')} />
          </button>
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
            <Badge className={listing.listingType === 'rent' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}>
              {listing.listingType === 'rent' ? 'For Rent' : 'For Sale'}
            </Badge>
            {isComplex && (
              <Badge className="bg-violet-600 text-white">
                Community
              </Badge>
            )}
            {listing.hasVideo && (
              <Badge className="bg-black/70 text-white gap-1">
                <Video className="h-3 w-3" />
              </Badge>
            )}
            {listing.hasVirtualTour && (
              <Badge className="bg-black/70 text-white gap-1">
                <View className="h-3 w-3" />
              </Badge>
            )}
          </div>
          {mainImage && (
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <p className="text-white text-2xl font-bold">
                {isComplex && listing.priceRange ? (
                  <>
                    {formatPrice(listing.priceRange.min)}
                    <span className="text-lg font-normal"> - {formatPrice(listing.priceRange.max)}</span>
                  </>
                ) : (
                  formatPrice(listing.price)
                )}
                {priceLabel && <span className="text-sm font-normal">{priceLabel}</span>}
              </p>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-1 hover:text-blue-600 transition-colors line-clamp-1">
            {listing.propertyName}
          </h3>
          {!mainImage && (
            <p className="text-blue-600 font-bold text-xl mb-1">
              {isComplex && listing.priceRange
                ? `${formatPrice(listing.priceRange.min)} - ${formatPrice(listing.priceRange.max)}`
                : formatPrice(listing.price)}
              {priceLabel && <span className="text-sm font-normal text-slate-500">{priceLabel}</span>}
            </p>
          )}
          <p className="text-slate-500 flex items-center gap-1 text-sm mb-3 line-clamp-1">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            {listing.address.city}, {listing.address.state}
          </p>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            {bedroomDisplay && (
              <span className="flex items-center gap-1">
                <Bed className="h-4 w-4" /> {bedroomDisplay}
              </span>
            )}
            {!isComplex && listing.bathrooms !== null && (
              <span className="flex items-center gap-1">
                <Bath className="h-4 w-4" /> {listing.bathrooms}
              </span>
            )}
            {!isComplex && listing.sizeSqFt && (
              <span className="flex items-center gap-1">
                <Square className="h-4 w-4" /> {listing.sizeSqFt.toLocaleString()}
              </span>
            )}
            {isComplex && listing.unitCount && (
              <span className="flex items-center gap-1 text-violet-600 font-medium">
                {listing.unitCount} units
              </span>
            )}
          </div>
          {listing.agent && (
            <p className="text-xs text-slate-400 mt-2 truncate">
              {listing.agent.name}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// Map View Component using Google Maps
function MapView({ 
  listings, 
  formatPrice 
}: { 
  listings: Listing[];
  formatPrice: (price: number) => string;
}) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [geocodedListings, setGeocodedListings] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const getPropertyUrl = (listing: Listing) => {
    // Agent listings go to agent's listing page
    if (listing.source === 'agent' && listing.agent?.subdomain) {
      return `/${listing.agent.subdomain}/listings/${listing.propertySlug}`;
    }
    // Property manager listings go to their subdomain
    if (listing.landlord?.subdomain) {
      return `/${listing.landlord.subdomain}/properties/${listing.propertySlug}`;
    }
    // Fallback
    return `/properties/${listing.propertySlug}`;
  };

  // Geocode addresses when map loads
  useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return;
    
    const geocoder = new google.maps.Geocoder();
    
    listings.forEach((listing) => {
      // Skip if already has coords or already geocoded
      if (listing.address.lat && listing.address.lng) {
        setGeocodedListings(prev => new Map(prev).set(listing.id, { 
          lat: listing.address.lat!, 
          lng: listing.address.lng! 
        }));
        return;
      }
      
      if (geocodedListings.has(listing.id)) return;
      
      const address = `${listing.address.street}, ${listing.address.city}, ${listing.address.state} ${listing.address.zip}`;
      
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          setGeocodedListings(prev => new Map(prev).set(listing.id, { 
            lat: location.lat(), 
            lng: location.lng() 
          }));
        }
      });
    });
  }, [isLoaded, listings]);

  // Get listings with coordinates (either from data or geocoded)
  const listingsWithCoords = useMemo(() => {
    return listings.filter(l => {
      if (l.address.lat && l.address.lng) return true;
      return geocodedListings.has(l.id);
    }).map(l => ({
      ...l,
      coords: l.address.lat && l.address.lng 
        ? { lat: l.address.lat, lng: l.address.lng }
        : geocodedListings.get(l.id)!
    }));
  }, [listings, geocodedListings]);

  // Calculate map center based on listings or default to Las Vegas
  const center = useMemo(() => {
    if (listingsWithCoords.length > 0) {
      const avgLat = listingsWithCoords.reduce((sum, l) => sum + l.coords.lat, 0) / listingsWithCoords.length;
      const avgLng = listingsWithCoords.reduce((sum, l) => sum + l.coords.lng, 0) / listingsWithCoords.length;
      return { lat: avgLat, lng: avgLng };
    }
    // Default to Las Vegas
    return { lat: 36.1699, lng: -115.1398 };
  }, [listingsWithCoords]);

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
  };

  const onMarkerClick = useCallback((listing: Listing) => {
    setSelectedListing(listing);
  }, []);
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Map Container */}
      <div className="flex-1 relative bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <MapIcon className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Map</h3>
              <p className="text-slate-500 text-sm">Please try again later</p>
            </div>
          </div>
        ) : !isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500">Loading map...</p>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <MapIcon className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search filters</p>
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={11}

            options={mapOptions}
            onClick={() => setSelectedListing(null)}
          >
            {listingsWithCoords.map((listing) => (
              <OverlayView
                key={listing.id}
                position={listing.coords}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); setSelectedListing(listing); }}
                  className="cursor-pointer"
                  style={{ transform: 'translate(-50%, -100%)' }}
                >
                  {/* Map Pin Marker */}
                  <div 
                    className={cn(
                      "relative transition-transform hover:scale-110",
                      selectedListing?.id === listing.id && "scale-110 z-10"
                    )}
                    style={{ width: '36px', height: '52px' }}
                  >
                    <svg 
                      width="36" 
                      height="52" 
                      viewBox="0 0 36 52" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-lg absolute inset-0"
                    >
                      {/* Slimmer pin shape */}
                      <path 
                        d="M18 0C8.06 0 0 8.06 0 18C0 32 18 52 18 52C18 52 36 32 36 18C36 8.06 27.94 0 18 0Z" 
                        className={cn(
                          selectedListing?.id === listing.id 
                            ? "fill-violet-600" 
                            : listing.listingType === 'sale' 
                              ? "fill-emerald-600"
                              : "fill-blue-600"
                        )}
                      />
                      {/* Dark green inner circle */}
                      <circle cx="18" cy="18" r="13" fill="#166534" />
                    </svg>
                    {/* Price text positioned inside the circle */}
                    <span 
                      className="absolute font-bold text-[10px] text-white"
                      style={{ 
                        top: '15px', 
                        left: '50%', 
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {listing.price >= 1000000 
                        ? `$${(listing.price / 1000000).toFixed(1)}M`
                        : listing.price >= 1000 
                          ? `$${Math.round(listing.price / 1000)}K`
                          : `$${listing.price}`
                      }
                    </span>
                  </div>
                </div>
              </OverlayView>
            ))}
            
            {/* Popup card above selected pin */}
            {selectedListing && listingsWithCoords.find(l => l.id === selectedListing.id) && (
              <OverlayView
                position={listingsWithCoords.find(l => l.id === selectedListing.id)!.coords}
                mapPaneName={OverlayView.FLOAT_PANE}
              >
                <div 
                  style={{ transform: 'translate(-50%, -100%)', marginTop: '-60px' }}
                  className="relative"
                >
                  <Link href={getPropertyUrl(selectedListing)} className="block">
                    <Card className="shadow-xl w-64 hover:shadow-2xl transition-shadow cursor-pointer bg-white">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedListing(null); }}
                        className="absolute top-2 right-2 p-1 hover:bg-slate-100 rounded z-10 bg-white/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="flex gap-3 p-3">
                        <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                          <Image
                            src={selectedListing.images[0] || '/images/livingroom.jpg'}
                            alt={selectedListing.propertyName}
                            fill
                            className="object-cover"
                          />
                          <Badge 
                            className={cn(
                              "absolute bottom-1 left-1 text-[9px] px-1 py-0",
                              selectedListing.listingType === 'rent' ? 'bg-blue-600' : 'bg-emerald-600'
                            )}
                          >
                            {selectedListing.listingType === 'rent' ? 'Rent' : 'Sale'}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-blue-600">{formatPrice(selectedListing.price)}{selectedListing.listingType === 'rent' ? '/mo' : ''}</p>
                          <p className="font-medium text-sm truncate text-slate-900">{selectedListing.propertyName}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {selectedListing.address.city}, {selectedListing.address.state}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            {selectedListing.bedrooms !== null && <span>{selectedListing.bedrooms} bd</span>}
                            {selectedListing.bathrooms !== null && <span>{selectedListing.bathrooms} ba</span>}
                            {selectedListing.sizeSqFt && <span>{selectedListing.sizeSqFt.toLocaleString()} sqft</span>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                  {/* Arrow pointing down to pin */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-white" />
                </div>
              </OverlayView>
            )}
          </GoogleMap>
        )}
      </div>
      
      {/* Listings Sidebar */}
      <div className="w-full lg:w-96 overflow-y-auto max-h-[300px] lg:max-h-full pr-2">
        <div className="space-y-3 pb-4">
          {listings.map((listing) => (
            <Card 
              key={listing.id}
              className={cn(
                "cursor-pointer hover:shadow-md transition-shadow",
                selectedListing?.id === listing.id && "ring-2 ring-blue-600"
              )}
              onClick={() => setSelectedListing(listing)}
            >
              <Link href={getPropertyUrl(listing)}>
                <div className="flex gap-3 p-3">
                  <div className="relative w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={listing.images[0] || '/images/livingroom.jpg'}
                      alt={listing.propertyName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-blue-600">{formatPrice(listing.price)}{listing.listingType === 'rent' ? '/mo' : ''}</p>
                    <p className="font-medium text-sm truncate">{listing.propertyName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {listing.address.city}, {listing.address.state}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      {listing.bedrooms !== null && <span>{listing.bedrooms} bd</span>}
                      {listing.bathrooms !== null && <span>{listing.bathrooms} ba</span>}
                      {listing.sizeSqFt && <span>{listing.sizeSqFt} sqft</span>}
                    </div>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
