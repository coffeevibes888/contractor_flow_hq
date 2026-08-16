'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Bed,
  Bath,
  Square,
  Home,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Video,
  Car,
  CalendarClock,
  Maximize2,
  X,
  Play,
} from 'lucide-react';

interface PublicListingDetailProps {
  listing: any;
  agent: any;
  openHouses: any[];
  similarListings: any[];
  subdomain: string;
}

export default function PublicListingDetail({
  listing,
  agent,
  openHouses,
  similarListings,
  subdomain,
}: PublicListingDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const address = listing.address as any;
  const features = listing.features || [];
  const images = listing.images || [];

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/agent/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          listingId: listing.id,
          source: 'subdomain_listing',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Message Sent!',
          description: `${agent.name} will get back to you soon.`,
        });
        setContactForm({ name: '', email: '', phone: '', message: '' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied!',
        description: 'Listing URL copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy link.',
        variant: 'destructive',
      });
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Photo Gallery Modal
  const PhotoGalleryModal = () => (
    <Dialog open={showAllPhotos} onOpenChange={setShowAllPhotos}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 bg-black/95 border-none">
        <DialogTitle className="sr-only">Listing photo gallery</DialogTitle>
        <div className="relative w-full h-full flex flex-col">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {currentImageIndex + 1} / {images.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAllPhotos(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 relative flex items-center justify-center">
            {images[currentImageIndex] && (
              <Image
                src={images[currentImageIndex]}
                alt={`Photo ${currentImageIndex + 1}`}
                fill
                className="object-contain"
                priority
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={prevImage}
              className="absolute left-4 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextImage}
              className="absolute right-4 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
          <div className="p-4 flex gap-2 overflow-x-auto">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`relative w-20 h-14 flex-shrink-0 rounded overflow-hidden ${idx === currentImageIndex ? 'ring-2 ring-white' : ''
                  }`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Video Modal
  const VideoModal = () => {
    if (!listing.videoUrl) return null;
    // Detect if it's a YouTube/Vimeo embed or a direct video file
    const isYoutube = listing.videoUrl.includes('youtube.com') || listing.videoUrl.includes('youtu.be');
    const isVimeo = listing.videoUrl.includes('vimeo.com');
    const getEmbedUrl = (url: string) => {
      if (isYoutube) {
        const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
        return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
      }
      if (isVimeo) {
        const match = url.match(/vimeo\.com\/(\d+)/);
        return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : url;
      }
      return url;
    };

    return (
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black border-none">
          <DialogTitle className="sr-only">Listing video player</DialogTitle>
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {isYoutube || isVimeo ? (
              <iframe
                src={getEmbedUrl(listing.videoUrl)}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={listing.videoUrl}
                className="absolute inset-0 w-full h-full"
                controls
                autoPlay
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowVideo(false)}
            className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PhotoGalleryModal />
      <VideoModal />
      {/* Main Site Navigation */}
      <header className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900">
            <Home className="h-5 w-5 text-amber-600" />
            Property Flow HQ
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Link href="/listings" className="hover:text-slate-900 transition-colors">Listings</Link>
            <Link href="/contractor-marketplace" className="hover:text-slate-900 transition-colors">Contractor Marketplace</Link>
            <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5 text-slate-600" />
            </Button>
          </div>
        </div>
        {/* Secondary bar: back to agent profile */}
        <div className="border-t border-slate-100 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${subdomain}`)}
              className="text-slate-600 h-7 px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Profile
            </Button>
            {agent?.logoUrl && (
              <div className="relative w-5 h-5 rounded-full overflow-hidden">
                <Image src={agent.logoUrl} alt={agent.name} fill className="object-contain" />
              </div>
            )}
            {agent?.name && (
              <span className="text-sm text-slate-600">{agent.name}</span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left Column - Listing Details */}
          <div className="space-y-6">
            {/* Image Gallery */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden h-[500px]">
                {/* Main Large Image */}
                <div className="relative col-span-1 row-span-2 cursor-pointer group" onClick={() => { setCurrentImageIndex(0); setShowAllPhotos(true); }}>
                  {images[0] ? (
                    <>
                      <Image
                        src={images[0]}
                        alt="Main property photo"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        priority
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <Home className="h-16 w-16 text-slate-400" />
                    </div>
                  )}
                </div>
                {/* Side Images */}
                <div className="grid grid-rows-2 gap-2">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="relative cursor-pointer group"
                      onClick={() => { setCurrentImageIndex(idx); setShowAllPhotos(true); }}
                    >
                      {images[idx] ? (
                        <>
                          <Image
                            src={images[idx]}
                            alt={`Property photo ${idx + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                          <Home className="h-8 w-8 text-slate-400" />
                        </div>
                      )}
                      {idx === 3 && images.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            +{images.length - 4} more
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Overlay Buttons */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAllPhotos(true)}
                  className="bg-white/90 hover:bg-white"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  View all {images.length} photos
                </Button>
                {listing.videoUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowVideo(true)}
                    className="bg-white/90 hover:bg-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Video Tour
                  </Button>
                )}
              </div>

              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                <Badge className={`text-sm px-3 py-1 ${listing.status === 'active' ? 'bg-emerald-500 text-white' :
                  listing.status === 'pending' ? 'bg-amber-500 text-white' :
                    listing.status === 'sold' ? 'bg-violet-500 text-white' :
                      'bg-slate-500 text-white'
                  }`}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Listing Type Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-slate-600">
                {listing.propertyType.charAt(0).toUpperCase() + listing.propertyType.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-slate-600">
                For {listing.listingType === 'sale' ? 'Sale' : listing.listingType === 'lease' ? 'Lease' : 'Auction'}
              </Badge>
              {listing.mlsNumber && (
                <Badge variant="outline" className="text-slate-600">
                  MLS: {listing.mlsNumber}
                </Badge>
              )}
            </div>

            {/* Title & Price Section */}
            <div className="space-y-2">
              {/* SEO-shaped H1: "3BR/2BA House for Sale in Denver, CO — $450,000" */}
              <h1 className="text-3xl font-bold text-slate-900">
                {(() => {
                  const beds = listing.bedrooms;
                  const baths = listing.bathrooms != null ? Number(listing.bathrooms) : null;
                  const bedBath = beds != null && baths != null
                    ? `${beds === 0 ? 'Studio' : `${beds}BR`}/${Number.isInteger(baths) ? baths : baths.toFixed(1).replace(/\.0$/, '')}BA`
                    : '';
                  const typeLabel = listing.propertyType
                    ? listing.propertyType.charAt(0).toUpperCase() + listing.propertyType.slice(1)
                    : 'Home';
                  const action = (listing.listingType || 'sale').toLowerCase() === 'rent' ? 'for Rent' : 'for Sale';
                  const locParts = [address?.city, address?.state].filter(Boolean).join(', ');
                  const priceStr = listing.price
                    ? `$${Math.round(Number(listing.price)).toLocaleString('en-US')}${(listing.listingType || '').toLowerCase() === 'rent' ? '/mo' : ''}`
                    : '';
                  const head = [bedBath, typeLabel].filter(Boolean).join(' ');
                  const inLoc = locParts ? ` in ${locParts}` : '';
                  return `${head} ${action}${inLoc}${priceStr ? ` — ${priceStr}` : ''}`.replace(/\s+/g, ' ').trim();
                })()}
              </h1>
              {/* Agent's own listing title as subtitle for context */}
              {listing.title && (
                <p className="text-lg font-medium text-slate-700">{listing.title}</p>
              )}
              <p className="text-base text-slate-600 flex items-center gap-1">
                <MapPin className="h-5 w-5" />
                {[address?.street, address?.city, address?.state, address?.zip].filter(Boolean).join(', ')}
              </p>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-4xl font-bold text-slate-900">
                  {formatCurrency(Number(listing.price))}
                </span>
                {listing.listingType === 'rent' && (
                  <span className="text-xl text-slate-600">/month</span>
                )}
              </div>
              {listing.pricePerSqFt && (
                <p className="text-slate-500">
                  {formatCurrency(Number(listing.pricePerSqFt))}/sqft
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 py-4 border-y border-slate-200">
              {listing.bedrooms !== null && (
                <div className="flex items-center gap-2">
                  <Bed className="h-6 w-6 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{listing.bedrooms}</p>
                    <p className="text-sm text-slate-500">beds</p>
                  </div>
                </div>
              )}
              {listing.bathrooms !== null && (
                <div className="flex items-center gap-2">
                  <Bath className="h-6 w-6 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{Number(listing.bathrooms)}</p>
                    <p className="text-sm text-slate-500">baths</p>
                  </div>
                </div>
              )}
              {listing.sizeSqFt && (
                <div className="flex items-center gap-2">
                  <Square className="h-6 w-6 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{formatNumber(listing.sizeSqFt)}</p>
                    <p className="text-sm text-slate-500">sqft</p>
                  </div>
                </div>
              )}
              {listing.garage !== null && (
                <div className="flex items-center gap-2">
                  <Car className="h-6 w-6 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{listing.garage}</p>
                    <p className="text-sm text-slate-500">garage</p>
                  </div>
                </div>
              )}
            </div>

            {/* Open Houses Section */}
            {openHouses.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarClock className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-slate-900">Open Houses Scheduled</h3>
                  </div>
                  <div className="space-y-3">
                    {openHouses.map((oh: any) => (
                      <div
                        key={oh.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center bg-amber-100 rounded-lg p-2 min-w-[60px]">
                            <p className="text-xs text-amber-600 font-semibold uppercase">
                              {new Date(oh.date).toLocaleDateString('en-US', { month: 'short' })}
                            </p>
                            <p className="text-xl font-bold text-amber-700">
                              {new Date(oh.date).getDate()}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatDate(oh.date)}
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatTime(oh.startTime)} - {formatTime(oh.endTime)}
                            </p>
                            {oh.isVirtual && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                Virtual Tour Available
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700"
                          onClick={() => setShowScheduleForm(true)}
                        >
                          {oh.rsvpEnabled ? 'RSVP' : 'Add to Calendar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">About This Home</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {listing.description || 'No description available.'}
              </p>
            </div>

            {/* Property Details Grid */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">Home Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {listing.yearBuilt && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">Year Built</p>
                    <p className="font-semibold text-slate-900">{listing.yearBuilt}</p>
                  </div>
                )}
                {listing.stories && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">Stories</p>
                    <p className="font-semibold text-slate-900">{listing.stories}</p>
                  </div>
                )}
                {listing.lotSizeSqFt && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">Lot Size</p>
                    <p className="font-semibold text-slate-900">{formatNumber(listing.lotSizeSqFt)} sqft</p>
                  </div>
                )}
                {listing.lotSizeAcres && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">Lot Size</p>
                    <p className="font-semibold text-slate-900">{listing.lotSizeAcres} acres</p>
                  </div>
                )}
                {listing.hoaFees && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">HOA Fees</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(Number(listing.hoaFees))}/mo</p>
                  </div>
                )}
                {listing.taxAmount && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">Annual Tax</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(Number(listing.taxAmount))}</p>
                  </div>
                )}
                {listing.parkingSpaces && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">Parking Spaces</p>
                    <p className="font-semibold text-slate-900">{listing.parkingSpaces}</p>
                  </div>
                )}
                {listing.mlsNumber && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-500">MLS Number</p>
                    <p className="font-semibold text-slate-900">{listing.mlsNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Features & Amenities */}
            {features.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-900">Features & Amenities</h2>
                <div className="grid grid-cols-2 gap-2">
                  {features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span className="text-slate-600 capitalize">{feature.replace(/-/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appliances */}
            {listing.appliances && listing.appliances.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-900">Appliances</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.appliances.map((appliance: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      {appliance}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Heating & Cooling */}
            {(listing.heating || listing.cooling) && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-900">Heating & Cooling</h2>
                <div className="grid grid-cols-2 gap-4">
                  {listing.heating && (
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <p className="text-sm text-slate-500">Heating</p>
                      <p className="font-semibold text-slate-900">{listing.heating}</p>
                    </div>
                  )}
                  {listing.cooling && (
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <p className="text-sm text-slate-500">Cooling</p>
                      <p className="font-semibold text-slate-900">{listing.cooling}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Virtual Tour Link */}
            {listing.virtualTourUrl && (
              <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <Video className="h-6 w-6 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Virtual Tour Available</h3>
                        <p className="text-sm text-slate-600">Take a 3D walkthrough of this home</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-violet-600 text-violet-600 hover:bg-violet-50"
                      onClick={() => window.open(listing.virtualTourUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Launch Tour
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Listed Date */}
            <div className="text-sm text-slate-500 pt-4">
              Listed on {new Date(listing.listedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Right Column - Agent Card & Contact */}
          <div className="space-y-6">
            {/* Agent Card - Sticky */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <Card className="border-slate-200 shadow-lg">
                <CardContent className="p-6">
                  {/* Agent Info */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200">
                      {agent.user?.image ? (
                        <Image
                          src={agent.user.image}
                          alt={agent.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-300">
                          <User className="h-8 w-8 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                      {agent.brokerage && (
                        <p className="text-sm text-slate-500">{agent.brokerage}</p>
                      )}
                      {agent.licenseNumber && (
                        <p className="text-xs text-slate-400">
                          Lic: {agent.licenseNumber}
                          {agent.licenseState && ` (${agent.licenseState})`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Agent Stats */}
                  {(agent.yearsExperience || agent.totalSales > 0) && (
                    <div className="flex gap-4 mb-4 pb-4 border-b border-slate-200">
                      {agent.yearsExperience && (
                        <div>
                          <p className="text-2xl font-bold text-slate-900">{agent.yearsExperience}+</p>
                          <p className="text-xs text-slate-500">Years Experience</p>
                        </div>
                      )}
                      {agent.totalSales > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-slate-900">{agent.totalSales}</p>
                          <p className="text-xs text-slate-500">Homes Sold</p>
                        </div>
                      )}
                      {agent.totalListings > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-slate-900">{agent.totalListings}</p>
                          <p className="text-xs text-slate-500">Active Listings</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contact Buttons */}
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => setShowScheduleForm(true)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule a Tour
                    </Button>

                    {agent.companyPhone && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.location.href = `tel:${agent.companyPhone}`}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {agent.companyPhone}
                      </Button>
                    )}

                    {agent.user?.email && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.location.href = `mailto:${agent.user.email}`}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form Card */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-slate-900">Interested? Send a Message</h3>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder={`I'm interested in ${listing.title}...`}
                        rows={4}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Similar Listings Section */}
        {similarListings.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              More Listings from {agent.name}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {similarListings.map((similar: any) => {
                const simAddress = similar.address as any;
                return (
                  <Card
                    key={similar.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/${subdomain}/listings/${similar.id}`)}
                  >
                    <div className="relative aspect-[4/3]">
                      {similar.images?.[0] ? (
                        <Image
                          src={similar.images[0]}
                          alt={similar.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                          <Home className="h-12 w-12 text-slate-400" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-slate-900/80 text-white">
                        For {similar.listingType === 'sale' ? 'Sale' : 'Rent'}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xl font-bold text-slate-900">
                        {formatCurrency(Number(similar.price))}
                      </p>
                      <h3 className="font-semibold text-slate-900 mt-1 line-clamp-1">
                        {similar.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {simAddress?.city}, {simAddress?.state}
                      </p>
                      <div className="flex gap-3 mt-2 text-sm text-slate-600">
                        {similar.bedrooms && <span>{similar.bedrooms} bd</span>}
                        {similar.bathrooms && <span>{Number(similar.bathrooms)} ba</span>}
                        {similar.sizeSqFt && <span>{formatNumber(similar.sizeSqFt)} sqft</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Tour Modal */}
      <Dialog open={showScheduleForm} onOpenChange={setShowScheduleForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a Tour</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Request a tour of <strong>{listing.title}</strong> with {agent.name}.
            </p>
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Date & Time</Label>
              <Textarea
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="When would you like to tour this property?"
                rows={3}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Request Tour'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
