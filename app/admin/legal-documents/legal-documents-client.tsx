'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  Scale,
  Plus,
  Trash2,
  Eye,
  Download,
  PenTool,
  FileSignature,
  Building2,
  CheckCircle2,
  Loader2,
  Settings2,
  Home,
  Check,
  Wand2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PDFFieldEditor from '@/components/admin/pdf-field-editor';
import LeaseFieldSetupModal from '@/components/admin/lease-field-setup-modal';
import { LeaseBuilderModal } from '@/components/admin/lease-builder';
import type { SignatureField } from '@/components/admin/pdf-field-editor';

interface LegalDocument {
  id: string;
  name: string;
  type: string;
  category: string | null;
  state: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  pageCount: number | null;
  isTemplate: boolean;
  isActive: boolean;
  isFieldsConfigured: boolean;
  description: string | null;
  signatureFields: SignatureField[] | null;
  createdAt: string;
}

interface Property {
  id: string;
  name: string;
  defaultLeaseDocumentId: string | null;
  address?: any;
  amenities?: string[];
}

interface Unit {
  id: string;
  name: string;
  type: string;
  rentAmount: number;
  propertyId: string;
}

const DOCUMENT_TYPES = [
  { value: 'lease', label: 'Lease Agreement' },
  { value: 'addendum', label: 'Lease Addendum' },
  { value: 'disclosure', label: 'Disclosure Form' },
  { value: 'notice', label: 'Notice' },
  { value: 'move_in', label: 'Move-In Checklist' },
  { value: 'move_out', label: 'Move-Out Checklist' },
  { value: 'rules', label: 'Rules & Regulations' },
  { value: 'pet_agreement', label: 'Pet Agreement' },
  { value: 'other', label: 'Other' },
];

export default function LegalDocumentsClient() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDocForAssign, setSelectedDocForAssign] = useState<LegalDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [showFieldSetupModal, setShowFieldSetupModal] = useState(false);
  const [newlyUploadedDoc, setNewlyUploadedDoc] = useState<LegalDocument | null>(null);
  
  // Lease Builder state
  const [showLeaseBuilder, setShowLeaseBuilder] = useState(false);
  const [leaseBuilderProperty, setLeaseBuilderProperty] = useState<Property | null>(null);
  const [leaseBuilderUnit, setLeaseBuilderUnit] = useState<Unit | null>(null);
  const [selectPropertyDialogOpen, setSelectPropertyDialogOpen] = useState(false);
  
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'lease',
    description: '',
    isTemplate: true,
    file: null as File | null,
  });

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/legal-documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/properties?includeUnits=true');
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
        
        // Extract all units from properties
        const allUnits: Unit[] = [];
        for (const prop of data.properties || []) {
          if (prop.units) {
            allUnits.push(...prop.units.map((u: any) => ({ 
              ...u, 
              propertyId: prop.id,
              rentAmount: Number(u.rentAmount),
            })));
          }
        }
        setUnits(allUnits);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchProperties();
  }, [fetchDocuments, fetchProperties]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('name', uploadForm.name);
      formData.append('type', uploadForm.type);
      formData.append('description', uploadForm.description);
      formData.append('isTemplate', String(uploadForm.isTemplate));

      const res = await fetch('/api/legal-documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadDialogOpen(false);
        setUploadForm({
          name: '',
          type: 'lease',
          description: '',
          isTemplate: true,
          file: null,
        });
        fetchDocuments();
        
        // If it's a lease, show the field setup modal
        if (uploadForm.type === 'lease' && data.document) {
          const doc = data.document as LegalDocument;
          setNewlyUploadedDoc(doc);
          setShowFieldSetupModal(true);
        }
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`/api/legal-documents/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchDocuments();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSaveFields = async (fields: SignatureField[]) => {
    if (!editingDocument) return;

    try {
      const res = await fetch(`/api/legal-documents/${editingDocument.id}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      if (res.ok) {
        setEditingDocument(null);
        fetchDocuments();
        alert('Signature fields saved successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save fields');
      }
    } catch (error) {
      console.error('Failed to save fields:', error);
      alert('Failed to save fields');
    }
  };

  const handleAssignToProperty = async (propertyId: string) => {
    if (!selectedDocForAssign) return;

    try {
      const res = await fetch('/api/legal-documents/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocForAssign.id,
          propertyId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Document assigned successfully!');
        setAssignDialogOpen(false);
        setSelectedDocForAssign(null);
        fetchProperties();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to assign document');
      }
    } catch (error) {
      console.error('Failed to assign document:', error);
      alert('Failed to assign document');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getPropertiesUsingDocument = (docId: string) => {
    return properties.filter(p => p.defaultLeaseDocumentId === docId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  // Show field editor if editing
  if (editingDocument && editingDocument.fileUrl) {
    return (
      <PDFFieldEditor
        documentUrl={editingDocument.fileUrl}
        documentName={editingDocument.name}
        initialFields={(editingDocument.signatureFields as SignatureField[]) || []}
        onSave={handleSaveFields}
        onCancel={() => setEditingDocument(null)}
      />
    );
  }

  const leaseDocuments = documents.filter(d => d.type === 'lease');
  const otherDocuments = documents.filter(d => d.type !== 'lease');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-violet-400" />
            Legal Documents
          </h1>
          <p className="text-slate-400 mt-1">
            Upload leases, configure signature fields, and assign to properties
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => setSelectPropertyDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Create Custom Lease
          </Button>
          
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Legal Document</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Upload a PDF lease or legal document. You can configure signature fields after upload.
                </DialogDescription>
              </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Document File (PDF)</Label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-violet-400/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploadForm.file ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>{uploadForm.file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-slate-400" />
                        <p className="text-sm text-slate-400">
                          Click to upload PDF document
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Nevada Standard Lease Agreement"
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select
                  value={uploadForm.type}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
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
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this document..."
                  className="bg-slate-800 border-slate-700 min-h-[80px]"
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={!uploadForm.file || !uploadForm.name || uploading}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* FREE Lease Builder Feature Card */}
      <Card className="border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-violet-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Wand2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-emerald-200 text-lg">FREE State-Aware Lease Builder</h3>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-xs rounded-full font-medium">NEW</span>
              </div>
              <p className="text-sm text-emerald-200/80 mt-2">
                Generate comprehensive, professionally-formatted lease agreements in seconds. Our lease builder includes:
              </p>
              <ul className="text-sm text-emerald-200/70 mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>20+ legally-required sections (parties, rent, deposits, rules, disclosures)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>State-specific disclosures auto-included (lead paint, mold, bed bugs, radon)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Auto-populated from your property data - no manual entry</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Pre-configured signature fields - no dragging required</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Complete audit trail for court documentation</span>
                </li>
              </ul>
              <div className="mt-4">
                <Button 
                  onClick={() => setSelectPropertyDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Create Your Free Lease Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works Card */}
      <Card className="border-blue-400/30 bg-blue-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileSignature className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-200">How it works</h3>
              <ol className="text-sm text-blue-200/80 mt-2 space-y-1 list-decimal list-inside">
                <li>Upload your lease PDF document</li>
                <li>Click "Configure Fields" to place signature and initial fields</li>
                <li>Assign the lease to properties (or set as default)</li>
                <li>When a tenant is approved, they'll sign at the fields you placed</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="leases" className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-white/10">
          <TabsTrigger value="leases" className="data-[state=active]:bg-violet-600">
            Lease Templates ({leaseDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="other" className="data-[state=active]:bg-violet-600">
            Other Documents ({otherDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="properties" className="data-[state=active]:bg-violet-600">
            Property Assignments
          </TabsTrigger>
        </TabsList>

        {/* Lease Templates Tab */}
        <TabsContent value="leases" className="space-y-4">
          {leaseDocuments.length === 0 ? (
            <Card className="border-white/10 bg-slate-900/60">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Lease Templates Yet</h3>
                  <p className="text-slate-400 mb-4">
                    Upload your lease agreement PDF to get started with e-signatures.
                  </p>
                  <Button
                    onClick={() => {
                      setUploadForm(prev => ({ ...prev, type: 'lease' }));
                      setUploadDialogOpen(true);
                    }}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Lease Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {leaseDocuments.map((doc) => {
                const assignedProperties = getPropertiesUsingDocument(doc.id);
                return (
                  <Card key={doc.id} className="border-white/10 bg-slate-900/60 hover:border-violet-400/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <FileSignature className="h-6 w-6 text-violet-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-white">{doc.name}</CardTitle>
                            <CardDescription className="text-xs text-slate-400">
                              {getTypeLabel(doc.type)}
                              {doc.state && ` • ${doc.state}`}
                            </CardDescription>
                          </div>
                        </div>
                        {doc.isFieldsConfigured ? (
                          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                            Needs Setup
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {doc.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">{doc.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="uppercase">{doc.fileType || 'PDF'}</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        {doc.pageCount && <span>{doc.pageCount} pages</span>}
                      </div>

                      {assignedProperties.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <Home className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">
                            Used by: {assignedProperties.map(p => p.name).join(', ')}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => setEditingDocument(doc)}
                          className={doc.isFieldsConfigured 
                            ? "bg-slate-700 hover:bg-slate-600" 
                            : "bg-violet-600 hover:bg-violet-700"
                          }
                        >
                          <Settings2 className="h-3 w-3 mr-1" />
                          {doc.isFieldsConfigured ? 'Edit Fields' : 'Configure Fields'}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 hover:bg-white/5"
                          onClick={() => {
                            setSelectedDocForAssign(doc);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          Assign
                        </Button>

                        {doc.fileUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 hover:bg-white/5"
                            onClick={() => window.open(doc.fileUrl!, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Other Documents Tab */}
        <TabsContent value="other" className="space-y-4">
          {otherDocuments.length === 0 ? (
            <Card className="border-white/10 bg-slate-900/60">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Other Documents</h3>
                  <p className="text-slate-400 mb-4">
                    Upload addendums, disclosures, notices, and other legal documents.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherDocuments.map((doc) => (
                <Card key={doc.id} className="border-white/10 bg-slate-900/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-slate-400" />
                      <div>
                        <CardTitle className="text-sm text-white">{doc.name}</CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          {getTypeLabel(doc.type)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {doc.fileUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 hover:bg-white/5"
                          onClick={() => window.open(doc.fileUrl!, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Property Assignments Tab */}
        <TabsContent value="properties" className="space-y-4">
          <Card className="border-white/10 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-white">Property Lease Assignments</CardTitle>
              <CardDescription className="text-slate-400">
                Assign default lease templates to each property. When a tenant is approved for a property, 
                the assigned lease will be used for signing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No properties found</p>
              ) : (
                <div className="space-y-3">
                  {properties.map((property) => {
                    const assignedDoc = documents.find(d => d.id === property.defaultLeaseDocumentId);
                    return (
                      <div
                        key={property.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-slate-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <Home className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="font-medium text-white">{property.name}</p>
                            {assignedDoc ? (
                              <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                {assignedDoc.name}
                                {!assignedDoc.isFieldsConfigured && (
                                  <span className="text-amber-400 ml-2">(needs field setup)</span>
                                )}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">No lease assigned</p>
                            )}
                          </div>
                        </div>
                        <Select
                          value={property.defaultLeaseDocumentId || ''}
                          onValueChange={(value) => {
                            if (value) {
                              const doc = documents.find(d => d.id === value);
                              if (doc) {
                                setSelectedDocForAssign(doc);
                                handleAssignToProperty(property.id);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
                            <SelectValue placeholder="Select lease..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {leaseDocuments.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.name}
                                {!doc.isFieldsConfigured && ' ⚠️'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign to Property Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Assign Lease to Property</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select which property should use "{selectedDocForAssign?.name}" as its default lease.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {properties.map((property) => (
              <button
                key={property.id}
                onClick={() => handleAssignToProperty(property.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-slate-400" />
                  <span className="text-white">{property.name}</span>
                </div>
                {property.defaultLeaseDocumentId === selectedDocForAssign?.id && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lease Field Setup Modal - shown after uploading a lease */}
      {newlyUploadedDoc && (
        <LeaseFieldSetupModal
          open={showFieldSetupModal}
          onOpenChange={setShowFieldSetupModal}
          documentName={newlyUploadedDoc.name}
          onConfigureFields={() => {
            setShowFieldSetupModal(false);
            setEditingDocument(newlyUploadedDoc);
            setNewlyUploadedDoc(null);
          }}
          onSkip={() => {
            setShowFieldSetupModal(false);
            setNewlyUploadedDoc(null);
          }}
        />
      )}

      {/* Select Property/Unit Dialog for Lease Builder */}
      <Dialog open={selectPropertyDialogOpen} onOpenChange={setSelectPropertyDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-emerald-400" />
              Create Custom Lease
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a property and unit to generate a comprehensive, court-ready lease agreement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={leaseBuilderProperty?.id || ''}
                onValueChange={(value) => {
                  const prop = properties.find(p => p.id === value);
                  setLeaseBuilderProperty(prop || null);
                  setLeaseBuilderUnit(null);
                }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Select a property..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 z-[200]">
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id} className="text-white focus:bg-slate-700 focus:text-white">
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {leaseBuilderProperty && (
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={leaseBuilderUnit?.id || ''}
                  onValueChange={(value) => {
                    const unit = units.find(u => u.id === value);
                    setLeaseBuilderUnit(unit || null);
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Select a unit..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 z-[200]">
                    {units.filter(u => u.propertyId === leaseBuilderProperty.id).map((unit) => (
                      <SelectItem key={unit.id} value={unit.id} className="text-white focus:bg-slate-700 focus:text-white">
                        {unit.name} ({unit.type}) - ${Number(unit.rentAmount).toLocaleString()}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button
              onClick={() => {
                if (leaseBuilderProperty && leaseBuilderUnit) {
                  setSelectPropertyDialogOpen(false);
                  setShowLeaseBuilder(true);
                }
              }}
              disabled={!leaseBuilderProperty || !leaseBuilderUnit}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Start Lease Builder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lease Builder Modal */}
      {leaseBuilderProperty && leaseBuilderUnit && (
        <LeaseBuilderModal
          open={showLeaseBuilder}
          onClose={() => {
            setShowLeaseBuilder(false);
            setLeaseBuilderProperty(null);
            setLeaseBuilderUnit(null);
          }}
          property={leaseBuilderProperty}
          unit={leaseBuilderUnit}
          onLeaseGenerated={(doc) => {
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
}
