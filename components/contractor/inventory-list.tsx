'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Edit,
  Trash2,
  QrCode,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  unitCost: any;
  reorderPoint: number | null;
  location: string | null;
  qrCode: string | null;
  vendor: {
    id: string;
    name: string;
    contactName: string | null;
  } | null;
};

export function InventoryList({ items }: { items: InventoryItem[] }) {
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const filteredItems = items.filter((item) => {
    if (filter === 'low') {
      return item.reorderPoint && item.quantity <= item.reorderPoint && item.quantity > 0;
    }
    if (filter === 'out') {
      return item.quantity === 0;
    }
    return true;
  });

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    }
    if (item.reorderPoint && item.quantity <= item.reorderPoint) {
      return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700', icon: TrendingUp };
    }
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle };
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
          All Items ({items.length})
        </button>
        <button
          onClick={() => setFilter('low')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'low'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Low Stock (
          {items.filter((i) => i.reorderPoint && i.quantity <= i.reorderPoint && i.quantity > 0).length}
          )
        </button>
        <button
          onClick={() => setFilter('out')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'out'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Out of Stock ({items.filter((i) => i.quantity === 0).length})
        </button>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No items found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const status = getStockStatus(item);
            const StatusIcon = status.icon;
            const totalValue = item.quantity * Number(item.unitCost);

            return (
              <div
                key={item.id}
                className="rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {item.name}
                      </h4>
                      {item.category && (
                        <p className="text-xs text-gray-600">{item.category}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={status.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  {item.sku && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-medium text-gray-900">{item.sku}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-bold text-gray-900">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Unit Cost:</span>
                    <span className="font-medium text-gray-900">
                      ${Number(item.unitCost).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-bold text-gray-900">
                      ${totalValue.toFixed(2)}
                    </span>
                  </div>
                  {item.location && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-gray-900">{item.location}</span>
                    </div>
                  )}
                  {item.reorderPoint && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Reorder Point:</span>
                      <span className="font-medium text-gray-900">
                        {item.reorderPoint} {item.unit}
                      </span>
                    </div>
                  )}
                </div>

                {item.vendor && (
                  <div className="mb-4 p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Vendor</p>
                    <Link
                      href={`/contractor-dashboard/vendors/${item.vendor.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {item.vendor.name}
                    </Link>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                  <Link href={`/contractor-dashboard/inventory/${item.id}/edit`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-2 border-gray-200"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  {item.qrCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-gray-200"
                    >
                      <QrCode className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
