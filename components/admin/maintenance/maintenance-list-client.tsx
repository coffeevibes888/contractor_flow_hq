'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Trash2,
  Filter,
  Search,
  MapPin,
  User,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Tenant {
  id: string;
  name: string | null;
  email: string;
}

interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  tenant: Tenant | null;
  propertyImage: string | null;
  propertyName: string;
  unitName: string;
  propertyId: string | undefined;
  unitId: string | undefined;
  address: string | null;
}

interface MaintenanceListClientProps {
  tickets: MaintenanceTicket[];
}

export function MaintenanceListClient({ tickets: initialTickets }: MaintenanceListClientProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate stats
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const completedCount = tickets.filter((t) => t.status === 'completed' || t.status === 'resolved').length;
  const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'resolved').length;

  const handleDelete = async () => {
    if (!ticketToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/maintenance-tickets/${ticketToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTickets(tickets.filter(t => t.id !== ticketToDelete));
        setDeleteDialogOpen(false);
        setTicketToDelete(null);
      } else {
        alert('Failed to delete ticket');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error deleting ticket');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <main className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900'>Maintenance Requests</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>
            Manage and track all maintenance requests
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <p className='text-xs text-gray-500 font-medium'>Open</p>
            <div className='h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center'>
              <Clock className='h-4 w-4 text-blue-600' />
            </div>
          </div>
          <p className='text-2xl font-bold text-gray-900'>{openCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <p className='text-xs text-gray-500 font-medium'>In Progress</p>
            <div className='h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center'>
              <Wrench className='h-4 w-4 text-violet-600' />
            </div>
          </div>
          <p className='text-2xl font-bold text-gray-900'>{inProgressCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <p className='text-xs text-gray-500 font-medium'>Completed</p>
            <div className='h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center'>
              <CheckCircle2 className='h-4 w-4 text-green-600' />
            </div>
          </div>
          <p className='text-2xl font-bold text-gray-900'>{completedCount}</p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <p className='text-xs text-gray-500 font-medium'>Urgent</p>
            <div className='h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center'>
              <AlertTriangle className='h-4 w-4 text-red-600' />
            </div>
          </div>
          <p className='text-2xl font-bold text-gray-900'>{urgentCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
              <Input
                placeholder='Search by title, property, unit, or tenant...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-full sm:w-[180px]'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='open'>Open</SelectItem>
              <SelectItem value='in_progress'>In Progress</SelectItem>
              <SelectItem value='resolved'>Resolved</SelectItem>
              <SelectItem value='completed'>Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className='w-full sm:w-[180px]'>
              <SelectValue placeholder='Priority' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Priority</SelectItem>
              <SelectItem value='urgent'>Urgent</SelectItem>
              <SelectItem value='high'>High</SelectItem>
              <SelectItem value='medium'>Medium</SelectItem>
              <SelectItem value='low'>Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {filteredTickets.length === 0 ? (
          <div className='col-span-full rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm'>
            <Wrench className='mx-auto h-12 w-12 text-gray-300 mb-3' />
            <p className='text-sm text-gray-500'>No maintenance tickets found</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className='rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden group'
            >
              {/* Property Image */}
              <div className='relative h-40 bg-gray-100'>
                {ticket.propertyImage ? (
                  <Image
                    src={ticket.propertyImage}
                    alt={ticket.propertyName}
                    fill
                    className='object-cover'
                  />
                ) : (
                  <div className='h-full flex items-center justify-center'>
                    <Building2 className='h-12 w-12 text-gray-300' />
                  </div>
                )}
                {/* Priority Badge */}
                <div className='absolute top-3 right-3'>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className='p-4 space-y-3'>
                {/* Property & Unit */}
                <div>
                  <div className='flex items-start gap-2 mb-1'>
                    <Building2 className='h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-semibold text-gray-900 truncate'>{ticket.propertyName}</p>
                      <p className='text-xs text-gray-500'>Unit {ticket.unitName}</p>
                    </div>
                  </div>
                  {ticket.address && (
                    <div className='flex items-start gap-2 mt-1'>
                      <MapPin className='h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0' />
                      <p className='text-xs text-gray-500 line-clamp-1'>{ticket.address}</p>
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className='text-sm font-semibold text-gray-900 line-clamp-1 mb-1'>
                    {ticket.title}
                  </h3>
                  <p className='text-xs text-gray-600 line-clamp-2'>{ticket.description}</p>
                </div>

                {/* Tenant */}
                {ticket.tenant && (
                  <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                    <div className='h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0'>
                      {(ticket.tenant.name || '?')[0].toUpperCase()}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-medium text-gray-700 truncate'>{ticket.tenant.name || 'Unknown'}</p>
                      <p className='text-xs text-gray-500 truncate'>{ticket.tenant.email}</p>
                    </div>
                  </div>
                )}

                {/* Status & Assignment */}
                <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                  {ticket.assignedToName && (
                    <div className='flex items-center gap-1 text-xs text-gray-600'>
                      <User className='h-3 w-3' />
                      <span className='truncate'>{ticket.assignedToName}</span>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className='flex items-center gap-1 text-xs text-gray-500'>
                  <Calendar className='h-3 w-3' />
                  <span>Created {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>

                {/* Actions */}
                <div className='flex gap-2 pt-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-1 h-9 text-xs'
                    onClick={() => router.push(`/admin/maintenance/${ticket.id}/enhanced`)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-9 px-3 text-red-600 hover:text-red-700 hover:bg-red-50'
                    onClick={(e) => {
                      e.stopPropagation();
                      setTicketToDelete(ticket.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the maintenance request and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-red-600 hover:bg-red-700'
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

// Made with Bob
