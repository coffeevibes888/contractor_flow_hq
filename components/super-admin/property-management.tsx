'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  Search,
  MoreVertical,
  Play,
  Pause,
  Ban,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  GlobeLock,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

type PropertyData = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  isPublished: boolean;
  addressVerified: boolean;
  address: any;
  landlordId: string | null;
  landlordName: string;
  unitCount: number;
  availableUnits: number;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  paused: { label: 'Paused', color: 'bg-amber-500/20 text-amber-400', icon: Pause },
  suspended: { label: 'Suspended', color: 'bg-red-500/20 text-red-400', icon: Ban },
  deleted: { label: 'Deleted', color: 'bg-slate-500/20 text-slate-400', icon: XCircle },
};

export default function PropertyManagement() {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [publishFilter, setPublishFilter] = useState<string>('all'); // 'all' | 'published' | 'draft'
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; property: PropertyData | null }>({
    open: false,
    property: null,
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/super-admin/properties');
      const data = await res.json();
      if (data.success !== false) {
        setProperties(data);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (propertyId: string, newStatus: string) => {
    setActionLoading(propertyId);
    try {
      const res = await fetch('/api/super-admin/properties/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, status: newStatus }),
      });
      const data = await res.json();
      
      if (data.success) {
        setProperties(prev =>
          prev.map(p => (p.id === propertyId ? { ...p, status: newStatus } : p))
        );
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch {
      alert('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (propertyId: string, currentlyPublished: boolean) => {
    setActionLoading(propertyId);
    try {
      const res = await fetch('/api/super-admin/properties/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, isPublished: !currentlyPublished }),
      });
      const data = await res.json();
      if (data.success) {
        setProperties(prev =>
          prev.map(p => (p.id === propertyId ? { ...p, isPublished: !currentlyPublished } : p))
        );
      } else {
        alert(data.message || 'Failed to update');
      }
    } catch {
      alert('Failed to update');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.property) return;
    
    setActionLoading(deleteDialog.property.id);
    try {
      const res = await fetch('/api/super-admin/properties/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: deleteDialog.property.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        setProperties(prev => prev.filter(p => p.id !== deleteDialog.property!.id));
        setDeleteDialog({ open: false, property: null });
      } else {
        alert(data.message || 'Failed to delete property');
      }
    } catch {
      alert('Failed to delete property');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.landlordName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesPublish =
      publishFilter === 'all' ||
      (publishFilter === 'published' && p.isPublished) ||
      (publishFilter === 'draft' && !p.isPublished);
    return matchesSearch && matchesStatus && matchesPublish;
  });

  const getAddress = (address: any) => {
    if (!address) return 'No address';
    if (typeof address === 'string') return address;
    return [address.street, address.city, address.state].filter(Boolean).join(', ') || 'No address';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Property Management</h1>
        <p className="text-sm text-slate-400">
          Manage all properties on the platform. Pause or suspend properties that violate terms.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl bg-slate-900/60 border border-white/10 p-4">
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-2xl font-bold text-white">{properties.length}</p>
        </div>
        <div className="rounded-xl bg-emerald-950/50 border border-emerald-800/50 p-4">
          <p className="text-xs text-emerald-400">Active</p>
          <p className="text-2xl font-bold text-emerald-400">
            {properties.filter(p => p.status === 'active').length}
          </p>
        </div>
        <div className="rounded-xl bg-amber-950/50 border border-amber-800/50 p-4">
          <p className="text-xs text-amber-400">Paused</p>
          <p className="text-2xl font-bold text-amber-400">
            {properties.filter(p => p.status === 'paused').length}
          </p>
        </div>
        <div className="rounded-xl bg-red-950/50 border border-red-800/50 p-4">
          <p className="text-xs text-red-400">Suspended</p>
          <p className="text-2xl font-bold text-red-400">
            {properties.filter(p => p.status === 'suspended').length}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
          <p className="text-xs text-slate-400">Deleted</p>
          <p className="text-2xl font-bold text-slate-400">
            {properties.filter(p => p.status === 'deleted').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search properties, landlords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900/60 border-white/10 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-slate-500 self-center pr-1">Status:</span>
            {['all', 'active', 'paused', 'suspended'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className={statusFilter === status
                  ? 'bg-violet-600 hover:bg-violet-500'
                  : 'border-white/10 text-slate-300 hover:bg-white/10'
                }
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-500 pr-1">Listing:</span>
          {[
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Live' },
            { value: 'draft', label: 'Draft' },
          ].map(opt => (
            <Button
              key={opt.value}
              variant={publishFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPublishFilter(opt.value)}
              className={publishFilter === opt.value
                ? 'bg-emerald-700 hover:bg-emerald-600'
                : 'border-white/10 text-slate-300 hover:bg-white/10'
              }
            >
              {opt.value === 'published' && <Globe className="h-3 w-3 mr-1.5" />}
              {opt.value === 'draft' && <GlobeLock className="h-3 w-3 mr-1.5" />}
              {opt.label}
            </Button>
          ))}
          <span className="text-xs text-slate-500 ml-2">
            {properties.filter(p => p.isPublished).length} live · {properties.filter(p => !p.isPublished).length} draft
          </span>
        </div>
      </div>

      {/* Properties Table */}
      <div className="rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-slate-400">Property</TableHead>
              <TableHead className="text-slate-400">Landlord</TableHead>
              <TableHead className="text-slate-400">Units</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Listed</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
              <TableHead className="text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProperties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No properties found
                </TableCell>
              </TableRow>
            ) : (
              filteredProperties.map(property => {
                const statusConfig = STATUS_CONFIG[property.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <TableRow key={property.id} className="border-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{property.name}</p>
                          <p className="text-xs text-slate-500">{getAddress(property.address)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{property.landlordName}</TableCell>
                    <TableCell>
                      <span className="text-white">{property.availableUnits}</span>
                      <span className="text-slate-500">/{property.unitCount}</span>
                      <span className="text-xs text-slate-500 ml-1">available</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig.color} border-0`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    {/* Listed toggle */}
                    <TableCell>
                      <button
                        onClick={() => handleTogglePublish(property.id, property.isPublished)}
                        disabled={actionLoading === property.id}
                        title={property.isPublished ? 'Click to remove from public listings' : 'Click to publish to public listings'}
                        className="flex items-center gap-1.5 group disabled:opacity-50"
                      >
                        {property.isPublished ? (
                          <>
                            <Globe className="h-4 w-4 text-emerald-400 group-hover:text-red-400 transition-colors" />
                            <span className="text-xs text-emerald-400 group-hover:text-red-400 transition-colors font-medium">Live</span>
                          </>
                        ) : (
                          <>
                            <GlobeLock className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                            <span className="text-xs text-slate-500 group-hover:text-emerald-400 transition-colors">Draft</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {formatDateTime(new Date(property.createdAt)).dateOnly}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            disabled={actionLoading === property.id}
                          >
                            {actionLoading === property.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 w-52">
                          <DropdownMenuItem asChild>
                            <a
                              href={`/products/${property.slug}`}
                              target="_blank"
                              className="text-slate-200 focus:bg-white/10"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Property
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />

                          {/* Publish toggle */}
                          <DropdownMenuItem
                            onClick={() => handleTogglePublish(property.id, property.isPublished)}
                            className={property.isPublished ? 'text-amber-400 focus:bg-amber-500/10' : 'text-emerald-400 focus:bg-emerald-500/10'}
                          >
                            {property.isPublished ? (
                              <><GlobeLock className="h-4 w-4 mr-2" />Remove from Listings</>
                            ) : (
                              <><Globe className="h-4 w-4 mr-2" />Publish to Listings</>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-white/10" />
                          
                          {property.status !== 'active' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(property.id, 'active')}
                              className="text-emerald-400 focus:bg-emerald-500/10"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          
                          {property.status !== 'paused' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(property.id, 'paused')}
                              className="text-amber-400 focus:bg-amber-500/10"
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          
                          {property.status !== 'suspended' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(property.id, 'suspended')}
                              className="text-red-400 focus:bg-red-500/10"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator className="bg-white/10" />
                          
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog({ open: true, property })}
                            className="text-red-400 focus:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, property: null })}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Property Permanently
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This action cannot be undone. This will permanently delete the property
              <span className="text-white font-medium"> {deleteDialog.property?.name}</span> and all associated data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
            <p className="font-medium mb-2">This will delete:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All {deleteDialog.property?.unitCount || 0} units</li>
              <li>All maintenance tickets</li>
              <li>All property documents</li>
              <li>All associated records</li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setDeleteDialog({ open: false, property: null })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={actionLoading === deleteDialog.property?.id}
              className="bg-red-600 hover:bg-red-500"
            >
              {actionLoading === deleteDialog.property?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
