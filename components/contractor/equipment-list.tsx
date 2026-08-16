'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  Edit,
  Trash2,
  QrCode,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Equipment = {
  id: string;
  name: string;
  type: string;
  serialNumber: string | null;
  purchaseDate: Date | null;
  purchasePrice: any;
  status: string;
  condition: string | null;
  location: string | null;
  qrCode: string | null;
  nextMaintenanceDate: Date | null;
  assignedToId: string | null;
  assignedToName: string | null;
};

export function EquipmentList({ equipment }: { equipment: Equipment[] }) {
  const [filter, setFilter] = useState<'all' | 'assigned' | 'available' | 'maintenance'>(
    'all'
  );

  const filteredEquipment = equipment.filter((item) => {
    if (filter === 'assigned') {
      return item.assignedToId !== null;
    }
    if (filter === 'available') {
      return item.assignedToId === null && item.status === 'available';
    }
    if (filter === 'maintenance') {
      return (
        item.nextMaintenanceDate && new Date(item.nextMaintenanceDate) <= new Date()
      );
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    in_use: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    retired: 'bg-gray-100 text-gray-700',
  };

  const conditionColors: Record<string, string> = {
    excellent: 'bg-emerald-100 text-emerald-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-red-700',
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
          All Equipment ({equipment.length})
        </button>
        <button
          onClick={() => setFilter('assigned')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'assigned'
              ? 'bg-violet-100 text-violet-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Assigned ({equipment.filter((e) => e.assignedToId).length})
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'available'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Available (
          {equipment.filter((e) => !e.assignedToId && e.status === 'available').length})
        </button>
        <button
          onClick={() => setFilter('maintenance')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'maintenance'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Needs Service (
          {
            equipment.filter(
              (e) => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) <= new Date()
            ).length
          }
          )
        </button>
      </div>

      {/* Equipment List */}
      {filteredEquipment.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No equipment found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => {
            const needsMaintenance =
              item.nextMaintenanceDate &&
              new Date(item.nextMaintenanceDate) <= new Date();

            return (
              <div
                key={item.id}
                className="rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                      <Wrench className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-600">{item.type}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[item.status] || statusColors.available}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  {item.serialNumber && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Serial:</span>
                      <span className="font-medium text-gray-900">
                        {item.serialNumber}
                      </span>
                    </div>
                  )}
                  {item.condition && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Condition:</span>
                      <Badge
                        className={
                          conditionColors[item.condition] || conditionColors.good
                        }
                      >
                        {item.condition}
                      </Badge>
                    </div>
                  )}
                  {item.purchasePrice && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Value:</span>
                      <span className="font-bold text-gray-900">
                        ${Number(item.purchasePrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {item.location && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium text-gray-900">{item.location}</span>
                    </div>
                  )}
                  {item.purchaseDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Purchased:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(item.purchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Maintenance Alert */}
                {needsMaintenance && (
                  <div className="mb-4 p-2 rounded-lg bg-amber-50 border-2 border-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-amber-900">
                          Maintenance Due
                        </p>
                        <p className="text-xs text-amber-700">
                          {new Date(item.nextMaintenanceDate!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assigned To */}
                {item.assignedToName ? (
                  <div className="mb-4 p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center flex-shrink-0 border-2 border-blue-200">
                        <span className="text-xs font-bold text-blue-600">
                          {item.assignedToName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600">Assigned to</p>
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {item.assignedToName}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm text-gray-600">Available for assignment</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                  <Link href={`/contractor-dashboard/equipment/${item.id}/edit`} className="flex-1">
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
