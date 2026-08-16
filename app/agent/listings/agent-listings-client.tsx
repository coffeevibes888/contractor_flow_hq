'use client';

import { useState } from 'react';
import { Building2, Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  propertyType: string;
  listingType: string;
  status: string;
  address: any;
  price: any;
  bedrooms: number | null;
  bathrooms: any;
  sizeSqFt: number | null;
  images: string[];
  createdAt: Date;
}

interface AgentListingsClientProps {
  listings: Listing[];
}

export default function AgentListingsClient({ listings }: AgentListingsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [deletingListing, setDeletingListing] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deletingListing) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agent/listings/${deletingListing.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast({ title: 'Success', description: 'Listing deleted' });
      setDeletingListing(null);
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (listing.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    const matchesType = typeFilter === 'all' || listing.propertyType === typeFilter;
    const matchesListingType = listingTypeFilter === 'all' || listing.listingType === listingTypeFilter;
    return matchesSearch && matchesStatus && matchesType && matchesListingType;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      sold: 'bg-violet-100 text-violet-700',
      withdrawn: 'bg-slate-100 text-slate-700',
      expired: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Listings</h1>
          <p className="text-slate-600 mt-1">{listings.length} total listings</p>
        </div>
        <Button asChild className="bg-amber-600 hover:bg-amber-700">
          <Link href="/agent/listings/create">
            <Plus className="h-4 w-4 mr-2" />
            Add Listing
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80"
          />
        </div>
        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger className="w-full md:w-40 bg-white/80">
            <SelectValue placeholder="Buy/Rent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Buy & Rent</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40 bg-white/80">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-40 bg-white/80">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="condo">Condo</SelectItem>
            <SelectItem value="townhouse">Townhouse</SelectItem>
            <SelectItem value="land">Land</SelectItem>
            <SelectItem value="multi-family">Multi-Family</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No listings found</h3>
            <p className="text-slate-500 mb-4">
              {listings.length === 0
                ? "You haven't added any listings yet."
                : 'No listings match your filters.'}
            </p>
            {listings.length === 0 && (
              <Button asChild className="bg-amber-600 hover:bg-amber-700">
                <Link href="/agent/listings/create">Add your first listing</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="bg-white/80 backdrop-blur-sm border-white/20 overflow-hidden group">
              <div className="relative aspect-[4/3]">
                {listing.images[0] ? (
                  <Image
                    src={listing.images[0]}
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-slate-400" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className={getStatusBadge(listing.status)}>{listing.status}</Badge>
                  <Badge className={listing.listingType === 'rent' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>
                    {listing.listingType === 'rent' ? 'For Rent' : 'For Sale'}
                  </Badge>
                </div>
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/agent/listings/${listing.id}`}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/agent/listings/${listing.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => setDeletingListing(listing)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 line-clamp-1">{listing.title}</h3>
                  <span className="font-bold text-amber-600 whitespace-nowrap">
                    {formatCurrency(Number(listing.price))}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-3">
                  {typeof listing.address === 'object' && listing.address?.city
                    ? `${listing.address.street || ''}, ${listing.address.city}, ${listing.address.state}`
                    : 'Address not set'}
                </p>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  {listing.bedrooms && (
                    <span>{listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''}</span>
                  )}
                  {listing.bathrooms && (
                    <span>{Number(listing.bathrooms)} bath{Number(listing.bathrooms) !== 1 ? 's' : ''}</span>
                  )}
                  {listing.sizeSqFt && (
                    <span>{listing.sizeSqFt.toLocaleString()} sqft</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingListing} onOpenChange={(open) => !open && setDeletingListing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingListing?.title}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
