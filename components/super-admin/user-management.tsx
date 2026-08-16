'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/utils';
import { Search, MoreVertical, Trash2, Ban, Eye, Building2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import LandlordDetailModal from './landlord-detail-modal';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  createdAt: string | Date;
  landlordId?: string;
  isBlocked?: boolean;
  onboardingCompleted?: boolean;
  emailVerified?: boolean;
}

interface UserManagementProps {
  landlords?: Array<{ id: string; name: string; ownerUserId: string }>;
}

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'user', label: 'Users' },
  { value: 'tenant', label: 'Tenants' },
  { value: 'landlord', label: 'Landlords' },
  { value: 'property_manager', label: 'Property Managers' },
  { value: 'contractor', label: 'Contractors' },
  { value: 'homeowner', label: 'Homeowners' },
  { value: 'agent', label: 'Agents' },
  { value: 'admin', label: 'Admins' },
  { value: 'superAdmin', label: 'Super Admins' },
];

export default function UserManagement({ landlords = [] }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'block' | null>(null);
  const [selectedLandlordId, setSelectedLandlordId] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page when role changes
  useEffect(() => {
    setPage(1);
  }, [filterRole, filterStatus]);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        role: filterRole,
        status: filterStatus,
      });
      if (debouncedSearch) params.set('q', debouncedSearch);

      const res = await fetch(`/api/super-admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, filterRole, filterStatus, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/super-admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUser.id }),
        });
        if (res.ok) {
          toast.success('User deleted successfully');
          fetchUsers();
        } else {
          toast.error('Failed to delete user');
        }
      } catch {
        toast.error('Error deleting user');
      }
    });
    setSelectedUser(null);
    setActionType(null);
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/super-admin/block-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUser.id }),
        });
        if (res.ok) {
          toast.success('User blocked successfully');
        } else {
          toast.error('Failed to block user');
        }
      } catch {
        toast.error('Error blocking user');
      }
    });
    setSelectedUser(null);
    setActionType(null);
  };

  const getLandlordForUser = (userId: string) => {
    return landlords.find(l => l.ownerUserId === userId);
  };

  const roleColor = (role: string | null) => {
    switch (role) {
      case 'landlord': return 'bg-violet-500/20 text-violet-400';
      case 'property_manager': return 'bg-violet-500/20 text-violet-300';
      case 'superAdmin': return 'bg-amber-500/20 text-amber-400';
      case 'admin': return 'bg-blue-500/20 text-blue-400';
      case 'contractor': return 'bg-orange-500/20 text-orange-400';
      case 'tenant': return 'bg-green-500/20 text-green-400';
      case 'homeowner': return 'bg-teal-500/20 text-teal-400';
      case 'agent': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-400"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-white/10 rounded-md bg-slate-900/60 text-white text-sm"
        >
          {ROLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-white/10 rounded-md bg-slate-900/60 text-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="complete">Fully Setup</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      {/* Result count */}
      <p className="text-sm text-slate-400">
        {loading ? 'Loading…' : `${total.toLocaleString()} user${total !== 1 ? 's' : ''} found`}
      </p>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 rounded-xl bg-slate-900/60 border border-white/10">
            No users found
          </div>
        ) : users.map((user) => {
          const landlord = getLandlordForUser(user.id);
          return (
            <div key={user.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{user.name || 'N/A'}</p>
                  <p className="text-sm text-slate-400 truncate">{user.email}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                    {landlord && (
                      <DropdownMenuItem onClick={() => setSelectedLandlordId(landlord.id)} className="text-slate-200">
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => { setSelectedUser(user); setActionType('block'); }}
                      className="text-orange-400"
                    >
                      <Ban className="h-4 w-4 mr-2" /> Block IP
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setSelectedUser(user); setActionType('delete'); }}
                      className="text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(user.role)}`}>
                  {user.role || 'user'}
                </span>
                {user.onboardingCompleted && user.emailVerified ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    Active
                  </span>
                ) : !user.emailVerified ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                    Unverified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                    Incomplete
                  </span>
                )}
                {landlord && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {landlord.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Joined {formatDateTime(new Date(user.createdAt)).dateOnly}
              </p>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl bg-slate-900/60 border border-white/10 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400">Role</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Landlord</TableHead>
              <TableHead className="text-slate-400">Created</TableHead>
              <TableHead className="text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-400 py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading users…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const landlord = getLandlordForUser(user.id);
                return (
                  <TableRow key={user.id} className="border-white/5">
                    <TableCell className="font-medium text-white">{user.name || 'N/A'}</TableCell>
                    <TableCell className="text-slate-300">{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(user.role)}`}>
                        {user.role || 'user'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.onboardingCompleted && user.emailVerified ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          Active
                        </span>
                      ) : !user.emailVerified ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                          Unverified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                          Incomplete
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {landlord ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-cyan-400 hover:text-cyan-300"
                          onClick={() => setSelectedLandlordId(landlord.id)}
                        >
                          {landlord.name}
                        </Button>
                      ) : <span className="text-slate-500">-</span>}
                    </TableCell>
                    <TableCell className="text-slate-300">{formatDateTime(new Date(user.createdAt)).dateOnly}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                          {landlord && (
                            <DropdownMenuItem onClick={() => setSelectedLandlordId(landlord.id)} className="text-slate-200">
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => { setSelectedUser(user); setActionType('block'); }}
                            className="text-orange-400"
                          >
                            <Ban className="h-4 w-4 mr-2" /> Block IP
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setSelectedUser(user); setActionType('delete'); }}
                            className="text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="border-white/10 text-slate-300 hover:bg-white/10 h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="border-white/10 text-slate-300 hover:bg-white/10 h-8 px-3"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedUser(null); }}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {actionType === 'delete' ? 'Delete User' : 'Block User IP'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {actionType === 'delete' 
                ? `Are you sure you want to delete ${selectedUser?.name || selectedUser?.email}? This action cannot be undone.`
                : `Are you sure you want to block ${selectedUser?.name || selectedUser?.email}? They will not be able to access the platform from their current IP address.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-white/10 text-white hover:bg-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={actionType === 'delete' ? handleDeleteUser : handleBlockUser}
              className={actionType === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : actionType === 'delete' ? 'Delete' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Landlord Detail Modal */}
      <LandlordDetailModal
        landlordId={selectedLandlordId}
        isOpen={!!selectedLandlordId}
        onClose={() => setSelectedLandlordId(null)}
      />
    </div>
  );
}
