'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Store,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Star,
  Package,
} from 'lucide-react';
import Link from 'next/link';

type Vendor = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  category: string;
  paymentTerms: string | null;
  rating: any;
  isActive: boolean;
  isPreferred: boolean;
  totalOrders: number;
};

export function VendorList({ vendors }: { vendors: Vendor[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredVendors = vendors.filter((vendor) => {
    if (filter === 'active') {
      return vendor.isActive;
    }
    if (filter === 'inactive') {
      return !vendor.isActive;
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Vendors ({vendors.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Active ({vendors.filter((v) => v.isActive).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'inactive'
              ? 'bg-gray-100 text-gray-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Inactive ({vendors.filter((v) => !v.isActive).length})
        </button>
      </div>

      {/* Vendors List */}
      {filteredVendors.length === 0 ? (
        <div className="text-center py-12">
          <Store className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No vendors found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {vendor.name}
                    </h4>
                    {vendor.category && (
                      <p className="text-xs text-gray-600">{vendor.category}</p>
                    )}
                  </div>
                </div>
                <Badge className={statusColors[vendor.isActive ? 'active' : 'inactive']}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {vendor.contactName && (
                  <p className="text-sm text-gray-600">
                    Contact: {vendor.contactName}
                  </p>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{vendor.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4 pt-4 border-t-2 border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                    <Star className="h-3 w-3" />
                    <span className="text-xs font-medium">Rating</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {vendor.rating ? Number(vendor.rating).toFixed(1) : 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <Package className="h-3 w-3" />
                    <span className="text-xs font-medium">Orders</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {vendor.totalOrders}
                  </p>
                </div>
              </div>

              {/* Payment Terms */}
              {vendor.paymentTerms && (
                <div className="mb-4 p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Payment Terms</p>
                  <p className="text-sm font-medium text-gray-900">
                    {vendor.paymentTerms}
                  </p>
                </div>
              )}

              {/* Website */}
              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-4 text-sm text-blue-600 hover:text-blue-700 truncate"
                >
                  Visit Website →
                </a>
              )}

              <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                <Link href={`/contractor-dashboard/vendors/${vendor.id}/edit`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-2 border-gray-200"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </Link>
                <Link href={`/contractor-dashboard/vendors/${vendor.id}`}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    View
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
