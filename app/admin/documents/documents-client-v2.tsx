'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Upload,
  Plus,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Star,
  Building2,
  Receipt,
  Scale,
  AlertTriangle,
  FolderOpen,
  Search,
  Filter,
  Camera,
  Loader2,
  CheckCircle2,
  Clock,
  FileSignature,
  Wand2,
  Check,
  Bell,
  ScanLine,
  X,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { LeaseBuilderModal } from '@/components/admin/lease-builder';
import { ReceiptUploadDialog } from '@/components/admin/documents/receipt-upload-dialog';
import { ReceiptList } from '@/components/admin/documents/receipt-list';
import { ReceiptListEnhanced } from '@/components/admin/documents/receipt-list-enhanced';
import { YearByPropertyView } from '@/components/admin/documents/year-by-property-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


// Interfaces
interface LegalDocument {
  id: string;
  name: string;
  type: string;
  category: string | null;
  state: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize?: number;
  isTemplate: boolean;
  isActive: boolean;
  description: string | null;
  docusignTemplateId: string | null;
  /** Resolved property anchor for the year-by-property view. Server-derived. */
  property?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface ScannedDocument {
  id: string;
  originalFileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  ocrText: string | null;
  ocrConfidence?: number;
  ocrProcessedAt?: string;
  documentType: string | null;
  classificationStatus: string;
  classifiedAt?: string;
  extractedData: any;
  conversionStatus: string;
  notes: string | null;
  propertyId?: string | null;
  property?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Property {
  id: string;
  name: string;
  address: { city?: string; state?: string; street?: string; zipCode?: string } | null;
  amenities?: string[];
}

interface Unit {
  id: string;
  name: string;
  type: string;
  rentAmount: number;
  propertyId: string;
}

interface LeaseTemplate {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  properties: Array<{ id: string; name: string }>;
}

interface ActiveLease {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  rentAmount: number;
  tenantSignedAt: string | null;
  landlordSignedAt: string | null;
  tenant: { id: string; name: string | null; email: string | null } | null;
  unit: {
    id: string;
    name: string;
    property: { id: string; name: string } | null;
  };
  signatureRequests: Array<{
    id: string;
    role: string;
    status: string;
    signedAt: string | null;
  }>;
}

interface DocumentsClientProps {
  legalDocuments: LegalDocument[];
  scannedDocuments: ScannedDocument[];
  properties: Property[];
  leaseTemplates?: LeaseTemplate[];
  activeLeases?: ActiveLease[];
}

const DOCUMENT_TYPES = [
  { value: 'lease', label: 'Lease Agreement', icon: FileSignature },
  { value: 'addendum', label: 'Lease Addendum', icon: FileText },
  { value: 'eviction', label: 'Eviction Notice', icon: AlertTriangle },
  { value: 'disclosure', label: 'Disclosure Form', icon: Scale },
  { value: 'receipt', label: 'Receipt', icon: Receipt },
  { value: 'notice', label: 'Notice', icon: FileText },
  { value: 'move_in', label: 'Move-In Checklist', icon: FileText },
  { value: 'move_out', label: 'Move-Out Checklist', icon: FileText },
  { value: 'other', label: 'Other', icon: FolderOpen },
];

const SCANNED_CATEGORIES = [
  { value: 'lease', label: 'Lease' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'tax', label: 'Tax Document' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];


export default function DocumentsClientV2({
  legalDocuments: initialLegalDocs,
  scannedDocuments: initialScannedDocs,
  properties,
  leaseTemplates: initialLeaseTemplates = [],
  activeLeases: initialActiveLeases = [],
}: DocumentsClientProps) {
  const { toast } = useToast();
  const [legalDocuments, setLegalDocuments] = useState(initialLegalDocs);
  const [scannedDocuments, setScannedDocuments] = useState(initialScannedDocs);
  const [leaseTemplates, setLeaseTemplates] = useState(initialLeaseTemplates);
  const [activeLeases, setActiveLeases] = useState(initialActiveLeases);
  const [activeTab, setActiveTab] = useState('legal');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'legal' | 'scan'>('legal');
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'lease',
    description: '',
    isTemplate: true,
    propertyId: '',
    file: null as File | null,
  });

  // Assign to property dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDocForAssign, setSelectedDocForAssign] = useState<LegalDocument | null>(null);
  const [assignPropertyId, setAssignPropertyId] = useState('');

  // Lease Builder state
  const [showLeaseBuilder, setShowLeaseBuilder] = useState(false);
  const [leaseBuilderProperty, setLeaseBuilderProperty] = useState<Property | null>(null);
  const [leaseBuilderUnit, setLeaseBuilderUnit] = useState<Unit | null>(null);
  const [selectPropertyDialogOpen, setSelectPropertyDialogOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  // Document viewer modal state
  const [viewingDocument, setViewingDocument] = useState<LegalDocument | null>(null);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentHtml, setDocumentHtml] = useState<string | null>(null);
  const [loadingDocumentPreview, setLoadingDocumentPreview] = useState(false);

  // Receipt upload dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  // Pre-fill an existing scanned doc into the receipt dialog for expense creation
  const [receiptDocToConvert, setReceiptDocToConvert] = useState<ScannedDocument | null>(null);

  // Memoize browser tabs to prevent recalculation on every render
  const browserTabs = useMemo(() => [
    {
      id: 'legal',
      label: 'Legal Documents',
      shortLabel: 'Legal',
      icon: Scale,
      count: legalDocuments.filter(d => d.type === 'lease' || d.type === 'addendum' || d.type === 'disclosure').length,
    },
    {
      id: 'notices',
      label: 'Notices',
      shortLabel: 'Notices',
      icon: Bell,
      count: legalDocuments.filter(d => d.type === 'notice' || d.type === 'eviction').length,
    },
    {
      id: 'leases',
      label: 'Active Leases',
      shortLabel: 'Leases',
      icon: FileSignature,
      count: activeLeases.length,
    },
    {
      id: 'receipts',
      label: 'Receipts',
      shortLabel: 'Receipts',
      icon: Receipt,
      count: scannedDocuments.filter(d => d.documentType === 'receipt' || d.documentType === 'invoice').length,
    },
    {
      id: 'templates',
      label: 'Templates',
      shortLabel: 'Templates',
      icon: Wand2,
      count: leaseTemplates.length,
    },
  ], [legalDocuments, activeLeases, scannedDocuments, leaseTemplates]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Fetch units for a property
  const fetchUnitsForProperty = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/properties?includeUnits=true`);
      if (res.ok) {
        const data = await res.json();
        const property = data.properties?.find((p: any) => p.id === propertyId);
        if (property?.units) {
          setUnits(property.units.map((u: any) => ({
            ...u,
            propertyId,
            rentAmount: Number(u.rentAmount),
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const handlePropertySelectForLease = (propertyId: string) => {
    const prop = properties.find(p => p.id === propertyId);
    setLeaseBuilderProperty(prop || null);
    setLeaseBuilderUnit(null);
    if (prop) {
      fetchUnitsForProperty(propertyId);
    }
  };

  const refreshDocuments = async () => {
    try {
      const res = await fetch('/api/legal-documents');
      if (res.ok) {
        const data = await res.json();
        setLegalDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to refresh documents:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getTypeIcon = (type: string) => {
    const docType = DOCUMENT_TYPES.find((t) => t.value === type);
    return docType?.icon || FileText;
  };

  // Document viewer state
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  // Handle viewing a document in modal
  const handleViewDocument = async (doc: LegalDocument) => {
    setViewingDocument(doc);
    setDocumentViewerOpen(true);
    setDocumentHtml(null);
    setSignedPdfUrl(null);
    
    // If it's a lease document, try to fetch the preview
    if (doc.type === 'lease') {
      setLoadingDocumentPreview(true);
      try {
        const res = await fetch(`/api/legal-documents/${doc.id}/preview`);
        if (res.ok) {
          const data = await res.json();
          setDocumentHtml(data.html || null);
          setSignedPdfUrl(data.signedPdfUrl || null);
        }
      } catch (error) {
        console.error('Failed to load document preview:', error);
      } finally {
        setLoadingDocumentPreview(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm((prev) => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };


  const handleUpload = async () => {
    if (!uploadForm.file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);

      if (uploadType === 'legal') {
        formData.append('name', uploadForm.name);
        formData.append('type', uploadForm.type);
        formData.append('description', uploadForm.description);
        formData.append('isTemplate', String(uploadForm.isTemplate));
        if (uploadForm.propertyId) {
          formData.append('propertyId', uploadForm.propertyId);
        }

        const res = await fetch('/api/legal-documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setLegalDocuments((prev) => [data.document, ...prev]);
          toast({ title: 'Document uploaded successfully' });
        } else {
          const error = await res.json();
          toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        }
      } else {
        formData.append('category', uploadForm.type);
        if (uploadForm.propertyId) {
          formData.append('propertyId', uploadForm.propertyId);
        }

        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.documents) {
            setScannedDocuments((prev) => [...data.documents, ...prev]);
          }
          toast({ title: 'Document uploaded for processing' });
        } else {
          toast({ title: 'Upload failed', variant: 'destructive' });
        }
      }

      setUploadDialogOpen(false);
      setUploadForm({
        name: '',
        type: 'lease',
        description: '',
        isTemplate: true,
        propertyId: '',
        file: null,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = useCallback(async (id: string, type: 'legal' | 'scanned') => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const endpoint = type === 'legal' ? `/api/legal-documents/${id}` : `/api/documents/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });

      if (res.ok) {
        if (type === 'legal') {
          setLegalDocuments((prev) => prev.filter((d) => d.id !== id));
        } else {
          setScannedDocuments((prev) => prev.filter((d) => d.id !== id));
        }
        toast({ title: 'Document deleted' });
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  }, [toast]);

  const handleSetDefault = async (docId: string, propertyId: string) => {
    try {
      const res = await fetch('/api/legal-documents/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, propertyId }),
      });

      if (res.ok) {
        toast({ title: 'Default lease set for property' });
        setAssignDialogOpen(false);
      } else {
        const error = await res.json();
        toast({ title: 'Failed to set default', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to set default', variant: 'destructive' });
    }
  };

  const openUploadDialog = (type: 'legal' | 'scan', docType?: string) => {
    setUploadType(type);
    if (docType) {
      setUploadForm((prev) => ({ ...prev, type: docType }));
    }
    setUploadDialogOpen(true);
  };

  // Memoize filtered documents to prevent recalculation on every render
  const filteredLegalDocs = useMemo(() => {
    return legalDocuments.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (activeTab === 'legal') {
        return matchesSearch && (doc.type === 'lease' || doc.type === 'addendum' || doc.type === 'disclosure');
      }
      if (activeTab === 'notices') {
        return matchesSearch && (doc.type === 'notice' || doc.type === 'eviction');
      }
      return matchesSearch;
    });
  }, [legalDocuments, searchQuery, activeTab]);

  const filteredScannedDocs = useMemo(() => {
    return scannedDocuments.filter((doc) => {
      const matchesSearch = doc.originalFileName.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'receipts') {
        return matchesSearch && (doc.documentType === 'receipt' || doc.documentType === 'invoice');
      }
      if (filterType !== 'all') {
        return matchesSearch && doc.documentType === filterType;
      }
      return matchesSearch;
    });
  }, [scannedDocuments, searchQuery, activeTab, filterType]);


  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'legal':
        return (
          <YearByPropertyView
            items={filteredLegalDocs.filter(
              (d) =>
                d.type === 'lease' || d.type === 'addendum' || d.type === 'disclosure',
            )}
            properties={properties}
            getDate={(d) => d.createdAt}
            getPropertyId={(d) => d.property?.id ?? null}
            getPropertyName={(d) => d.property?.name ?? null}
            paneTitle="Lease agreements, addendums, and disclosure forms."
            paneAction={
              <Button
                size="sm"
                variant="outline"
                onClick={() => openUploadDialog('legal', 'lease')}
                className="border-cyan-400/50 text-cyan-500 hover:bg-cyan-500/20"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Document
              </Button>
            }
            renderBucket={(items) => (
              <DocumentGrid
                documents={items as LegalDocument[]}
                type="legal"
                onDelete={(id) => handleDelete(id, 'legal')}
                onAssign={(doc) => {
                  setSelectedDocForAssign(doc);
                  setAssignDialogOpen(true);
                }}
                onView={handleViewDocument}
                formatFileSize={formatFileSize}
                getTypeLabel={getTypeLabel}
                getTypeIcon={getTypeIcon}
              />
            )}
            emptyState={
              <div className="text-center">
                <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  No legal documents this year
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pick a different year or add a document to get started.
                </p>
              </div>
            }
          />
        );

      case 'notices':
        return (
          <YearByPropertyView
            items={filteredLegalDocs.filter(
              (d) => d.type === 'notice' || d.type === 'eviction',
            )}
            properties={properties}
            getDate={(d) => d.createdAt}
            getPropertyId={(d) => d.property?.id ?? null}
            getPropertyName={(d) => d.property?.name ?? null}
            paneTitle="Eviction notices, legal notices, and communications."
            paneAction={
              <Button
                size="sm"
                variant="outline"
                onClick={() => openUploadDialog('legal', 'notice')}
                className="border-amber-400/50 text-amber-300 hover:bg-amber-500/20"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Notice
              </Button>
            }
            renderBucket={(items) => (
              <DocumentGrid
                documents={items as LegalDocument[]}
                type="legal"
                onDelete={(id) => handleDelete(id, 'legal')}
                onAssign={(doc) => {
                  setSelectedDocForAssign(doc);
                  setAssignDialogOpen(true);
                }}
                onView={handleViewDocument}
                formatFileSize={formatFileSize}
                getTypeLabel={getTypeLabel}
                getTypeIcon={getTypeIcon}
              />
            )}
            emptyState={
              <div className="text-center">
                <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  No notices this year
                </p>
              </div>
            }
          />
        );

      case 'leases':
        return (
          <YearByPropertyView
            items={activeLeases}
            properties={properties}
            getDate={(l) => l.startDate}
            getPropertyId={(l) => l.unit.property?.id ?? null}
            getPropertyName={(l) => l.unit.property?.name ?? null}
            paneTitle="Active leases and pending signatures."
            renderBucket={(items) => (
              <ActiveLeasesGrid leases={items as ActiveLease[]} />
            )}
            emptyState={
              <div className="text-center">
                <FileSignature className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  No active leases this year
                </p>
              </div>
            }
          />
        );

      case 'receipts':
        return (
          <div className="space-y-4">
            {/* Header card — manual receipt entry, organized by year/property */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-4 md:p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shrink-0">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Receipts &amp; Expenses
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload a receipt, pick which property it belongs to, and log
                    the expense. Receipts are filed under the right tax year so
                    they're easy to find later.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setReceiptDialogOpen(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg text-white font-semibold shadow-md shrink-0 h-10 px-4"
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  Upload Receipt
                </Button>
              </div>
            </div>

            {/* Enhanced Hybrid View */}
            <ReceiptListEnhanced<ScannedDocument>
              documents={filteredScannedDocs as ScannedDocument[]}
              onDelete={(id) => handleDelete(id, 'scanned')}
              formatFileSize={formatFileSize}
              onCreateExpense={(doc) => {
                setReceiptDocToConvert(doc);
                setReceiptDialogOpen(true);
              }}
            />
          </div>
        );

      case 'templates': {
        // Expand a template into one row per assigned property so the
        // year-by-property view can place it in the right bucket.
        type TemplateRow = {
          template: LeaseTemplate;
          propertyId: string | null;
          propertyName: string | null;
        };
        const templateRows: TemplateRow[] = leaseTemplates.flatMap((t): TemplateRow[] => {
          if (!t.properties || t.properties.length === 0) {
            return [{ template: t, propertyId: null, propertyName: null }];
          }
          return t.properties.map((p) => ({
            template: t,
            propertyId: p.id,
            propertyName: p.name,
          }));
        });
        return (
          <YearByPropertyView<TemplateRow>
            items={templateRows}
            properties={properties}
            getDate={(row) => row.template.createdAt}
            getPropertyId={(row) => row.propertyId}
            getPropertyName={(row) => row.propertyName}
            paneTitle="Lease templates ready to assign to a property."
            paneAction={
              <Button
                size="sm"
                variant="outline"
                onClick={() => openUploadDialog('legal', 'lease')}
                className="border-violet-400/50 text-violet-500 hover:bg-violet-500/20"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Template
              </Button>
            }
            renderBucket={(rows) => (
              <LeaseTemplateGrid
                templates={(rows as TemplateRow[]).map((r) => r.template)}
                onDelete={async (id) => {
                  try {
                    const res = await fetch(`/api/lease-templates/${id}`, {
                      method: 'DELETE',
                    });
                    if (res.ok) {
                      setLeaseTemplates((prev) => prev.filter((t) => t.id !== id));
                      toast({ title: 'Template deleted' });
                    }
                  } catch (error) {
                    toast({ title: 'Delete failed', variant: 'destructive' });
                  }
                }}
                onSetDefault={async (id) => {
                  try {
                    const res = await fetch(`/api/lease-templates/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isDefault: true }),
                    });
                    if (res.ok) {
                      setLeaseTemplates((prev) =>
                        prev.map((t) => ({ ...t, isDefault: t.id === id })),
                      );
                      toast({ title: 'Default template updated' });
                    }
                  } catch (error) {
                    toast({ title: 'Update failed', variant: 'destructive' });
                  }
                }}
              />
            )}
            emptyState={
              <div className="text-center">
                <Wand2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  No templates this year
                </p>
              </div>
            }
          />
        );
      }

      default:
        return null;
    }
  };


  return (
    <main className="w-full">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-cyan-500 font-medium">
              Documents
            </p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black leading-tight flex items-center gap-2">
              <FolderOpen className="h-5 w-5 md:h-7 md:w-7 text-cyan-500 shrink-0" />
              Document Center
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
              Leases, notices, receipts, and templates for every property.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 h-11 md:h-12 text-sm md:text-base text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {/* Free Lease Builder — Prominent CTA (commented out — available from nav + property creation flow)
        <div className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 p-5 md:p-6 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-bl-full" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900">Free Lease Builder</h3>
                <p className="text-sm text-gray-600 mt-1 max-w-lg">
                  Generate a state-aware, court-ready lease for any property in minutes. Covers security deposits, late fees, maintenance responsibilities, and more.
                </p>
                <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  This tool generates a template. Have a licensed attorney in your state review before use.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setSelectPropertyDialogOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-xl text-white font-bold shadow-lg shrink-0 h-12 px-6 text-sm"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Build a Lease
            </Button>
          </div>
        </div>
        */}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex gap-1 bg-white border border-gray-200 p-1 rounded-lg shadow-sm h-auto overflow-x-auto">
            {browserTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm whitespace-nowrap flex-1 font-medium text-gray-600"
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">{tab.label}</span>
                  {tab.count > 0 && (
                    <Badge className="ml-1.5 bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs px-1.5 sm:px-2 border-0">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Single content slot driven by activeTab */}
          <TabsContent value={activeTab} className="mt-4 md:mt-5">
            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
              {renderTabContent()}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-lg mx-4">
            <DialogHeader>
              <DialogTitle>
                {uploadType === 'legal' ? 'Upload Document' : 'Scan & Categorize'}
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                {uploadType === 'legal'
                  ? 'Upload a lease, notice, or legal document.'
                  : 'Upload a receipt or document to automatically categorize.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* File Upload Area */}
              <div className="space-y-2">
                <Label>Document File</Label>
                <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center hover:border-cyan-400/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label htmlFor="doc-upload" className="cursor-pointer">
                    {uploadForm.file ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-300">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="truncate max-w-[200px]">{uploadForm.file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-gray-300" />
                        <p className="text-sm text-gray-500">Click or drag to upload</p>
                        <p className="text-xs text-gray-400">PDF, Word, JPG, PNG (max 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {uploadType === 'legal' && (
                <>
                  <div className="space-y-2">
                    <Label>Document Name</Label>
                    <Input
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Standard Lease Agreement"
                      className="bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select
                      value={uploadForm.type}
                      onValueChange={(value) => setUploadForm((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-800">
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-gray-700 hover:bg-gray-100 focus:bg-gray-100">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description..."
                      className="bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 min-h-[80px]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isTemplate"
                      checked={uploadForm.isTemplate}
                      onChange={(e) => setUploadForm((prev) => ({ ...prev, isTemplate: e.target.checked }))}
                      className="rounded border-white/30 bg-white/10"
                    />
                    <Label htmlFor="isTemplate" className="text-sm cursor-pointer">
                      Use as template for new leases
                    </Label>
                  </div>
                </>
              )}

              {uploadType === 'scan' && (
                <div className="space-y-2">
                  <Label>Category (Optional)</Label>
                  <Select
                    value={uploadForm.type}
                    onValueChange={(value) => setUploadForm((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-800">
                      {SCANNED_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-gray-700 hover:bg-gray-100 focus:bg-gray-100">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Assign to Property (Optional)</Label>
                <Select
                  value={uploadForm.propertyId || 'none'}
                  onValueChange={(value) => setUploadForm((prev) => ({ ...prev, propertyId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                    <SelectValue placeholder="Select property..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-800">
                    <SelectItem value="none" className="text-gray-700 hover:bg-gray-100 focus:bg-gray-100">No property</SelectItem>
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id} className="text-gray-700 hover:bg-gray-100 focus:bg-gray-100">
                        {prop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!uploadForm.file || uploading}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Assign to Property Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Set as Default Lease</DialogTitle>
              <DialogDescription className="text-gray-500">
                Choose a property to use "{selectedDocForAssign?.name}" as the default lease template.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Property</Label>
                <Select value={assignPropertyId} onValueChange={setAssignPropertyId}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                    <SelectValue placeholder="Choose property..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-800">
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id} className="text-gray-700 hover:bg-gray-100 focus:bg-gray-100">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-800/70" />
                          <span>{prop.name}</span>
                          {prop.address?.city && (
                            <span className="text-gray-400 text-xs">
                              ({prop.address.city}, {prop.address.state})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  className="flex-1 border-white/30 text-gray-800 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedDocForAssign && handleSetDefault(selectedDocForAssign.id, assignPropertyId)}
                  disabled={!assignPropertyId}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Select Property/Unit Dialog for Lease Builder */}
        <Dialog open={selectPropertyDialogOpen} onOpenChange={setSelectPropertyDialogOpen}>
          <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-lg !overflow-visible">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-emerald-300" />
                Create Custom Lease
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Select a property to generate a comprehensive, state-aware lease agreement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4 overflow-visible">
              <div className="space-y-2">
                <Label>Property <span className="text-red-300">*</span></Label>
                <Select
                  value={leaseBuilderProperty?.id || ''}
                  onValueChange={handlePropertySelectForLease}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                    <SelectValue placeholder="Select a property..." />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white border-gray-200 text-gray-800 z-[9999]" 
                    position="popper" 
                    sideOffset={4}
                  >
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id} className="text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-800">
                        {prop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {leaseBuilderProperty && (
                <div className="space-y-2">
                  <Label>Unit <span className="text-gray-400 text-xs font-normal">(Optional)</span></Label>
                  {units.length === 0 ? (
                    <p className="text-xs text-gray-800/70 bg-white/10 rounded-lg p-3 border border-gray-200">
                      No units found for this property. You can still create a lease template - just enter the rent amount in the next step.
                    </p>
                  ) : (
                    <Select
                      value={leaseBuilderUnit?.id || '_none'}
                      onValueChange={(value) => {
                        if (value === '_none') {
                          setLeaseBuilderUnit(null);
                        } else {
                          const unit = units.find(u => u.id === value);
                          setLeaseBuilderUnit(unit || null);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-gray-800">
                        <SelectValue placeholder="Select a unit (optional)..." />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-white border-gray-200 text-gray-800 z-[9999]" 
                        position="popper" 
                        sideOffset={4}
                      >
                        <SelectItem value="_none" className="text-gray-800/70 hover:bg-white/10 focus:bg-white/10">
                          No specific unit (create template)
                        </SelectItem>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id} className="text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-800">
                            {unit.name} ({unit.type}) - ${Number(unit.rentAmount).toLocaleString()}/mo
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              
              <Button
                onClick={() => {
                  if (leaseBuilderProperty) {
                    setSelectPropertyDialogOpen(false);
                    setShowLeaseBuilder(true);
                  }
                }}
                disabled={!leaseBuilderProperty}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Start Lease Builder
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lease Builder Modal */}
        {leaseBuilderProperty && (
          <LeaseBuilderModal
            open={showLeaseBuilder}
            onClose={() => {
              setShowLeaseBuilder(false);
              setLeaseBuilderProperty(null);
              setLeaseBuilderUnit(null);
            }}
            property={leaseBuilderProperty}
            unit={leaseBuilderUnit}
            onLeaseGenerated={() => {
              refreshDocuments();
            }}
          />
        )}

        {/* Receipt Upload Dialog */}
        <ReceiptUploadDialog
          open={receiptDialogOpen}
          onOpenChange={(open) => {
            setReceiptDialogOpen(open);
            if (!open) setReceiptDocToConvert(null);
          }}
          properties={properties}
          existingDocumentId={receiptDocToConvert?.id}
          existingDocumentPropertyId={receiptDocToConvert?.propertyId ?? undefined}
          onSuccess={async () => {
            // Refresh scanned documents
            try {
              const res = await fetch('/api/documents');
              if (res.ok) {
                const data = await res.json();
                setScannedDocuments(data.documents || []);
              }
            } catch (error) {
              console.error('Failed to refresh documents:', error);
            }
          }}
        />

        {/* Document Viewer Modal */}
        {documentViewerOpen && viewingDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setDocumentViewerOpen(false);
                setViewingDocument(null);
                setDocumentHtml(null);
              }}
            />
            <div className="relative z-10 w-full max-w-5xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-indigo-600">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <FileSignature className="h-5 w-5 text-gray-800" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{viewingDocument.name}</h2>
                    <p className="text-sm text-gray-500">{getTypeLabel(viewingDocument.type)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewingDocument.fileUrl && (
                    <a
                      href={viewingDocument.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setDocumentViewerOpen(false);
                      setViewingDocument(null);
                      setDocumentHtml(null);
                    }}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-800" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto bg-gray-50">
                {loadingDocumentPreview ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  </div>
                ) : documentHtml ? (
                  <div className="p-8">
                    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
                      <div
                        className="prose prose-sm max-w-none text-gray-800"
                        style={{ fontSize: '14px', lineHeight: '1.6' }}
                        dangerouslySetInnerHTML={{ __html: documentHtml }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-center p-8">
                    <FileText className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Preview Available</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      This document doesn&apos;t have a preview. You can download it to view the contents.
                    </p>
                    {viewingDocument.fileUrl && (
                      <a
                        href={viewingDocument.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-gray-800 rounded-lg hover:bg-cyan-700"
                      >
                        <Download className="h-4 w-4" />
                        Download Document
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


// Document Grid Component for Legal Documents — compact horizontal rows
function DocumentGrid({
  documents,
  type,
  onDelete,
  onAssign,
  onView,
  formatFileSize,
  getTypeLabel,
  getTypeIcon,
}: {
  documents: LegalDocument[];
  type: 'legal';
  onDelete: (id: string) => void;
  onAssign: (doc: LegalDocument) => void;
  onView: (doc: LegalDocument) => void;
  formatFileSize: (bytes?: number) => string;
  getTypeLabel: (type: string) => string;
  getTypeIcon: (type: string) => any;
}) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-700">No Documents</p>
        <p className="text-xs text-gray-500 mt-1">Upload your first document to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {documents.map((doc) => {
        const Icon = getTypeIcon(doc.type);
        return (
          <div
            key={doc.id}
            onClick={() => onView(doc)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-white hover:border-cyan-300 hover:bg-cyan-50/30 transition-all cursor-pointer group"
          >
            {/* Icon */}
            <div className="h-8 w-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-cyan-600" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
              <p className="text-[11px] text-gray-500 truncate">
                {getTypeLabel(doc.type)}{doc.state && ` • ${doc.state}`}
                {doc.description && ` — ${doc.description}`}
              </p>
            </div>

            {/* Meta */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {doc.fileType && (
                <span className="text-[10px] uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                  {doc.fileType}
                </span>
              )}
              {doc.isTemplate && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                  Template
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
              </span>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-gray-200 text-gray-800">
                <DropdownMenuItem onClick={() => onView(doc)} className="cursor-pointer">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                {doc.fileUrl && (
                  <DropdownMenuItem asChild className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <a href={doc.fileUrl} download onClick={(e) => e.stopPropagation()}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </DropdownMenuItem>
                )}
                {doc.type === 'lease' && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign(doc); }} className="cursor-pointer">
                    <Star className="h-4 w-4 mr-2" />
                    Set as Default
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                  className="cursor-pointer text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}


// Scanned Document Grid Component
function ScannedDocumentGrid({
  documents,
  onDelete,
  formatFileSize,
  properties,
  onCreateExpense,
}: {
  documents: ScannedDocument[];
  onDelete: (id: string) => void;
  formatFileSize: (bytes?: number) => string;
  properties: Property[];
  onCreateExpense?: (doc: ScannedDocument) => void;
}) {
  if (documents.length === 0) {
    return (
      <Card className="border-gray-200 bg-white/5">
        <CardContent className="py-12">
          <div className="text-center">
            <Camera className="h-12 w-12 mx-auto text-gray-800/40 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Scanned Documents</h3>
            <p className="text-gray-800/70 text-sm">
              Upload receipts, invoices, or other documents to categorize them.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'classified':
        return (
          <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/30 text-[10px] md:text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Classified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/30 text-amber-300 border-amber-400/30 text-[10px] md:text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'manual_review':
        return (
          <Badge className="bg-blue-500/30 text-blue-300 border-blue-400/30 text-[10px] md:text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Review
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCategoryIcon = (type: string | null) => {
    switch (type) {
      case 'receipt':
        return Receipt;
      case 'invoice':
        return FileText;
      case 'lease':
        return FileSignature;
      default:
        return FolderOpen;
    }
  };

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {documents.map((doc) => {
        const Icon = getCategoryIcon(doc.documentType);
        const extracted = doc.extractedData as any;
        const isReceipt = doc.documentType === 'receipt' || doc.documentType === 'invoice';
        const alreadyConverted = !!doc.conversionStatus && doc.conversionStatus === 'completed';
        const hasExtractedAmount = extracted?.amount != null;

        return (
          <Card
            key={doc.id}
            className="border-gray-200 bg-white/5 hover:bg-white/10 hover:border-emerald-400/40 transition-all group overflow-hidden"
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start justify-between gap-2 mb-2 md:mb-3">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-emerald-500/30 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 md:h-5 md:w-5 text-emerald-300" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 md:h-8 md:w-8 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-800" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border-gray-200 text-gray-800">
                    <DropdownMenuItem
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                      className="cursor-pointer text-gray-800 focus:text-gray-800 focus:bg-white/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer text-gray-800 focus:text-gray-800 focus:bg-white/10">
                      <a href={doc.fileUrl} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </DropdownMenuItem>
                    {isReceipt && !alreadyConverted && onCreateExpense && (
                      <DropdownMenuItem
                        onClick={() => onCreateExpense(doc)}
                        className="cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Create Expense
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete(doc.id)}
                      className="cursor-pointer text-red-300 focus:text-red-200 focus:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h4 className="text-xs md:text-sm font-medium text-gray-800 truncate mb-1">
                {doc.originalFileName}
              </h4>

              <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-3 flex-wrap">
                {getStatusBadge(doc.classificationStatus)}
                {doc.documentType && (
                  <span className="text-[10px] md:text-xs text-gray-800/70 capitalize">{doc.documentType}</span>
                )}
                {alreadyConverted && (
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30 text-[10px]">
                    <FileCheck className="h-3 w-3 mr-1" />
                    Expensed
                  </Badge>
                )}
              </div>

              {/* Extracted data preview */}
              {isReceipt && (extracted?.amount || extracted?.vendor || extracted?.date) && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/20 px-2.5 py-2 mb-2 space-y-1">
                  {extracted?.vendor && (
                    <p className="text-[10px] text-emerald-300 truncate font-medium">{extracted.vendor}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {extracted?.amount && (
                      <span className="text-[11px] font-bold text-emerald-200">
                        ${parseFloat(String(extracted.amount)).toFixed(2)}
                      </span>
                    )}
                    {extracted?.date && (
                      <span className="text-[10px] text-emerald-300/70">
                        {new Date(extracted.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Property badge */}
              {doc.property && (
                <div className="flex items-center gap-1 mb-2 text-[10px] md:text-xs">
                  <Building2 className="h-3 w-3 text-cyan-500" />
                  <span className="text-cyan-500 truncate">{doc.property.name}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-800/60">
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="uppercase bg-white/10 px-1 md:px-1.5 py-0.5 rounded">
                    {doc.fileType}
                  </span>
                  {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                </div>
              </div>

              {doc.ocrConfidence !== undefined && doc.ocrConfidence > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] md:text-xs mb-1">
                    <span className="text-gray-800/60">OCR Confidence</span>
                    <span className="text-gray-800/80">{doc.ocrConfidence.toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${doc.ocrConfidence}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Create Expense CTA for unconverted receipts */}
              {isReceipt && !alreadyConverted && onCreateExpense && (
                <button
                  onClick={() => onCreateExpense(doc)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold py-1.5 transition-colors"
                >
                  <Receipt className="h-3 w-3" />
                  {hasExtractedAmount ? 'Apply to Expense' : 'Create Expense'}
                </button>
              )}

              <p className="text-[10px] md:text-xs text-gray-800/60 mt-2">
                {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


// Lease Template Grid Component
function LeaseTemplateGrid({
  templates,
  onDelete,
  onSetDefault,
}: {
  templates: LeaseTemplate[];
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  if (templates.length === 0) {
    return (
      <Card className="border-gray-200 bg-white/5">
        <CardContent className="py-12">
          <div className="text-center">
            <Wand2 className="h-12 w-12 mx-auto text-gray-800/40 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Lease Templates</h3>
            <p className="text-gray-800/70 text-sm">
              Create a lease template to automatically generate leases when applications are approved.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="border-gray-200 bg-white/5 hover:bg-white/10 hover:border-emerald-400/40 transition-all group overflow-hidden"
        >
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-emerald-500/30 flex items-center justify-center shrink-0">
                  {template.type === 'builder' ? (
                    <Wand2 className="h-4 w-4 md:h-5 md:w-5 text-emerald-300" />
                  ) : (
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-emerald-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xs md:text-sm font-medium text-gray-800 truncate">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-[10px] md:text-xs text-gray-800/70 mt-0.5">
                    {template.type === 'builder' ? 'Builder Template' : 'PDF Template'}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-800" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200 text-gray-800">
                  {template.pdfUrl && (
                    <DropdownMenuItem
                      onClick={() => window.open(template.pdfUrl!, '_blank')}
                      className="cursor-pointer text-gray-800 focus:text-gray-800 focus:bg-white/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View PDF
                    </DropdownMenuItem>
                  )}
                  {!template.isDefault && (
                    <DropdownMenuItem
                      onClick={() => onSetDefault(template.id)}
                      className="cursor-pointer text-gray-800 focus:text-gray-800 focus:bg-white/10"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Set as Default
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(template.id)}
                    className="cursor-pointer text-red-300 focus:text-red-200 focus:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-0 p-3 md:p-4 md:pt-0">
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {template.isDefault && (
                <Badge className="bg-amber-500/30 text-amber-300 border-amber-400/30 text-[10px] md:text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] md:text-xs border-white/30 text-gray-800/80">
                {template.type === 'builder' ? 'Builder' : 'PDF'}
              </Badge>
            </div>
            {template.properties.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-800/60 mb-1">Assigned to:</p>
                <div className="flex flex-wrap gap-1">
                  {template.properties.slice(0, 3).map((prop) => (
                    <span
                      key={prop.id}
                      className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-800/80"
                    >
                      {prop.name}
                    </span>
                  ))}
                  {template.properties.length > 3 && (
                    <span className="text-[10px] text-gray-800/60">
                      +{template.properties.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
            <p className="text-[10px] md:text-xs text-gray-800/60 mt-2">
              {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Active Leases Grid Component — compact horizontal rows
function ActiveLeasesGrid({ leases }: { leases: ActiveLease[] }) {
  if (leases.length === 0) {
    return (
      <div className="text-center py-8">
        <FileSignature className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-700">No Active Leases</p>
        <p className="text-xs text-gray-500 mt-1">Active leases will appear here once tenants sign their agreements.</p>
      </div>
    );
  }

  const getStatusBadge = (lease: ActiveLease) => {
    if (lease.status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Active
        </span>
      );
    }
    if (lease.tenantSignedAt && !lease.landlordSignedAt) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
          <Clock className="h-2.5 w-2.5" />
          Awaiting You
        </span>
      );
    }
    if (!lease.tenantSignedAt) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
          <Clock className="h-2.5 w-2.5" />
          Awaiting Tenant
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-1.5">
      {leases.map((lease) => (
        <div
          key={lease.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-white hover:border-cyan-300 hover:bg-cyan-50/30 transition-all"
        >
          {/* Icon */}
          <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <FileSignature className="h-4 w-4 text-violet-600" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {lease.tenant?.name || 'Tenant'} — {lease.unit.property?.name || 'Property'}, {lease.unit.name}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              ${lease.rentAmount.toLocaleString()}/mo • {new Date(lease.startDate).toLocaleDateString()}
              {lease.endDate && ` – ${new Date(lease.endDate).toLocaleDateString()}`}
            </p>
          </div>

          {/* Signatures */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-0.5 text-[10px] ${lease.tenantSignedAt ? 'text-emerald-600' : 'text-gray-400'}`}>
              {lease.tenantSignedAt ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span>Tenant</span>
            </div>
            <div className={`flex items-center gap-0.5 text-[10px] ${lease.landlordSignedAt ? 'text-emerald-600' : 'text-gray-400'}`}>
              {lease.landlordSignedAt ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span>Landlord</span>
            </div>
          </div>

          {/* Status */}
          {getStatusBadge(lease)}
        </div>
      ))}
    </div>
  );
}
