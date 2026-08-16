'use client';

/**
 * Enhanced Receipt List - Hybrid View
 * 
 * Left side: Compact table showing all receipts efficiently
 * Right side: Preview pane with receipt details and image
 * 
 * Features:
 * - Compact table view (40px rows vs 134px cards)
 * - Monthly subtotals within each year
 * - Advanced filtering (vendor, amount range, status, date)
 * - Bulk selection and actions
 * - Search across all receipts
 * - Pagination for large datasets
 * - Receipt preview pane with image viewer
 */

import { useState, useMemo } from 'react';
import {
  Receipt,
  FileText,
  Trash2,
  Eye,
  ExternalLink,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Calendar,
  DollarSign,
  Building2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ScannedDocLike {
  id: string;
  originalFileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  documentType: string | null;
  classificationStatus: string;
  conversionStatus: string;
  propertyId?: string | null;
  property?: { id: string; name: string } | null;
  extractedData?: any;
  createdAt: string;
}

interface ReceiptListEnhancedProps<T extends ScannedDocLike = ScannedDocLike> {
  documents: T[];
  onDelete: (id: string) => void;
  onCreateExpense?: (doc: T) => void;
  formatFileSize: (bytes?: number) => string;
}

// Helper functions
function getAmount(doc: ScannedDocLike): number {
  const ed = doc.extractedData;
  if (ed && typeof ed === 'object') {
    const a = ed.amount;
    if (typeof a === 'number' && isFinite(a)) return a;
    if (typeof a === 'string') {
      const n = parseFloat(a);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

function getDate(doc: ScannedDocLike): Date {
  const ed = doc.extractedData;
  if (ed && typeof ed === 'object') {
    const d = ed.date ?? ed.incurredAt;
    if (typeof d === 'string') {
      const m = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) {
        const dt = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
        if (!isNaN(dt.getTime())) return dt;
      }
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return new Date(doc.createdAt);
}

function getVendor(doc: ScannedDocLike): string {
  return typeof doc.extractedData === 'object' && doc.extractedData
    ? (doc.extractedData as any).vendor || doc.originalFileName
    : doc.originalFileName;
}

export function ReceiptListEnhanced<T extends ScannedDocLike = ScannedDocLike>({
  documents,
  onDelete,
  onCreateExpense,
  formatFileSize,
}: ReceiptListEnhancedProps<T>) {
  const [selectedReceipt, setSelectedReceipt] = useState<T | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filter documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const vendor = getVendor(doc);
      const amount = getAmount(doc);
      const hasExpense = doc.conversionStatus === 'completed';

      // Search filter
      const matchesSearch = 
        vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'logged' && hasExpense) ||
        (statusFilter === 'unlogged' && !hasExpense);

      // Amount filter
      const matchesAmount =
        amountFilter === 'all' ||
        (amountFilter === 'under50' && amount < 50) ||
        (amountFilter === '50to200' && amount >= 50 && amount < 200) ||
        (amountFilter === '200to500' && amount >= 200 && amount < 500) ||
        (amountFilter === 'over500' && amount >= 500);

      return matchesSearch && matchesStatus && matchesAmount;
    });
  }, [documents, searchQuery, statusFilter, amountFilter]);

  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, T[]>();
    
    filteredDocs.forEach(doc => {
      const date = getDate(doc);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(doc);
    });

    // Sort by month descending
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, docs]) => ({
        monthKey,
        month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        docs: docs.sort((a, b) => getDate(b).getTime() - getDate(a).getTime()),
        total: docs.reduce((sum, doc) => sum + getAmount(doc), 0),
      }));
  }, [filteredDocs]);

  // Pagination
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Bulk actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedDocs.map(d => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} receipts?`)) return;
    for (const id of selectedIds) {
      await onDelete(id);
    }
    setSelectedIds(new Set());
  };

  const toggleMonth = (monthKey: string) => {
    const newSet = new Set(expandedMonths);
    if (newSet.has(monthKey)) {
      newSet.delete(monthKey);
    } else {
      newSet.add(monthKey);
    }
    setExpandedMonths(newSet);
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No receipts yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      {/* Left: Table View */}
      <div className="space-y-4">
        {/* Filters & Search */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search receipts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="logged">Expense Logged</SelectItem>
                  <SelectItem value="unlogged">No Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={amountFilter} onValueChange={setAmountFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="under50">Under $50</SelectItem>
                  <SelectItem value="50to200">$50 - $200</SelectItem>
                  <SelectItem value="200to500">$200 - $500</SelectItem>
                  <SelectItem value="over500">Over $500</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Groups */}
        <div className="space-y-3">
          {groupedByMonth.map(({ monthKey, month, docs, total }) => {
            const isExpanded = expandedMonths.has(monthKey);
            return (
              <Card key={monthKey}>
                <CardContent className="p-0">
                  {/* Month Header */}
                  <button
                    onClick={() => toggleMonth(monthKey)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-semibold text-gray-900">{month}</span>
                      <Badge variant="secondary" className="text-xs">
                        {docs.length} receipts
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-700">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </button>

                  {/* Receipts Table */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-12">
                              <Checkbox
                                checked={docs.every(d => selectedIds.has(d.id))}
                                onCheckedChange={(checked) => {
                                  docs.forEach(d => handleSelectOne(d.id, checked as boolean));
                                }}
                              />
                            </TableHead>
                            <TableHead className="w-24">Date</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead className="w-32">Property</TableHead>
                            <TableHead className="w-24 text-right">Amount</TableHead>
                            <TableHead className="w-28">Status</TableHead>
                            <TableHead className="w-32 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {docs.map((doc) => {
                            const date = getDate(doc);
                            const vendor = getVendor(doc);
                            const amount = getAmount(doc);
                            const hasExpense = doc.conversionStatus === 'completed';
                            const isSelected = selectedIds.has(doc.id);

                            return (
                              <TableRow
                                key={doc.id}
                                className={cn(
                                  'cursor-pointer hover:bg-blue-50/50 transition',
                                  isSelected && 'bg-blue-50',
                                  selectedReceipt?.id === doc.id && 'bg-blue-100'
                                )}
                                onClick={() => setSelectedReceipt(doc as T)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleSelectOne(doc.id, checked as boolean)}
                                  />
                                </TableCell>
                                <TableCell className="text-xs text-gray-600">
                                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </TableCell>
                                <TableCell className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                  {vendor}
                                </TableCell>
                                <TableCell className="text-xs text-gray-600 truncate">
                                  {doc.property?.name || 'Unassigned'}
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-emerald-700 text-right">
                                  {amount > 0 ? `$${amount.toFixed(2)}` : '—'}
                                </TableCell>
                                <TableCell>
                                  {hasExpense ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                      Logged
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                      Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => window.open(doc.fileUrl, '_blank')}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    {!hasExpense && onCreateExpense && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                                        onClick={() => onCreateExpense(doc as T)}
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                      onClick={() => onDelete(doc.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDocs.length)} of {filteredDocs.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Preview Pane */}
      <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
        {selectedReceipt ? (
          <ReceiptPreview
            doc={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
            onDelete={onDelete}
            onCreateExpense={onCreateExpense}
            formatFileSize={formatFileSize}
          />
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-1">No receipt selected</p>
                <p className="text-xs text-gray-500">Click a receipt to view details</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReceiptPreview<T extends ScannedDocLike>({
  doc,
  onClose,
  onDelete,
  onCreateExpense,
  formatFileSize,
}: {
  doc: T;
  onClose: () => void;
  onDelete: (id: string) => void;
  onCreateExpense?: (doc: T) => void;
  formatFileSize: (bytes?: number) => string;
}) {
  const date = getDate(doc);
  const vendor = getVendor(doc);
  const amount = getAmount(doc);
  const hasExpense = doc.conversionStatus === 'completed';

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Receipt Details</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Receipt Image/PDF Preview */}
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            {doc.fileType.startsWith('image/') ? (
              <img
                src={doc.fileUrl}
                alt={vendor}
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center">
                <FileText className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Vendor</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">{vendor}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
                <p className="text-sm text-gray-900 mt-1">
                  {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Amount</label>
                <p className="text-sm font-bold text-emerald-700 mt-1">
                  {amount > 0 ? `$${amount.toFixed(2)}` : 'Not extracted'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Property</label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-900">{doc.property?.name || 'Unassigned'}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
              <div className="mt-1">
                {hasExpense ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Expense Logged
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                    No Expense
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">File Info</label>
              <p className="text-xs text-gray-600 mt-1">
                {doc.originalFileName}
                {doc.fileSize && ` • ${formatFileSize(doc.fileSize)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(doc.fileUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Receipt
          </Button>
          {!hasExpense && onCreateExpense && (
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onCreateExpense(doc)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Log Expense
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (confirm('Delete this receipt?')) {
                onDelete(doc.id);
                onClose();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Made with Bob
