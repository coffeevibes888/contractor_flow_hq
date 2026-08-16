'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { 
  PenTool, 
  Type, 
  Calendar, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'name' | 'text';
  role: 'tenant' | 'landlord';
  page: number;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
  label?: string;
  required: boolean;
}

interface PDFFieldEditorProps {
  documentUrl: string;
  documentName: string;
  initialFields?: SignatureField[];
  onSave: (fields: SignatureField[]) => Promise<void>;
  onCancel: () => void;
}

const FIELD_TYPES = [
  { type: 'signature', label: 'Signature', icon: PenTool, color: 'bg-violet-500', width: 20, height: 6 },
  { type: 'initial', label: 'Initial', icon: Type, color: 'bg-blue-500', width: 8, height: 5 },
  { type: 'date', label: 'Date', icon: Calendar, color: 'bg-emerald-500', width: 12, height: 4 },
  { type: 'name', label: 'Full Name', icon: User, color: 'bg-amber-500', width: 18, height: 4 },
] as const;

const ROLES = [
  { value: 'tenant', label: 'Tenant', color: 'text-blue-400' },
  { value: 'landlord', label: 'Landlord', color: 'text-violet-400' },
] as const;

export default function PDFFieldEditor({
  documentUrl,
  documentName,
  initialFields = [],
  onSave,
  onCancel,
}: PDFFieldEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [fields, setFields] = useState<SignatureField[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'tenant' | 'landlord'>('tenant');
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<{ fieldId: string; offsetX: number; offsetY: number } | null>(null);
  const [resizing, setResizing] = useState<{ fieldId: string; corner: string } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = (page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageSize({ width: viewport.width, height: viewport.height });
  };

  const generateFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addField = (type: SignatureField['type']) => {
    const fieldConfig = FIELD_TYPES.find(f => f.type === type);
    if (!fieldConfig) return;

    const newField: SignatureField = {
      id: generateFieldId(),
      type,
      role: selectedRole,
      page: currentPage,
      x: 10, // 10% from left
      y: 80, // 80% from top (near bottom)
      width: fieldConfig.width,
      height: fieldConfig.height,
      required: true,
    };

    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const deleteField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const updateField = (fieldId: string, updates: Partial<SignatureField>) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const handleMouseDown = (e: React.MouseEvent, fieldId: string, action: 'drag' | 'resize', corner?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (action === 'drag') {
      const field = fields.find(f => f.id === fieldId);
      if (!field) return;
      
      const fieldX = (field.x / 100) * rect.width;
      const fieldY = (field.y / 100) * rect.height;
      
      setDragging({
        fieldId,
        offsetX: e.clientX - rect.left - fieldX,
        offsetY: e.clientY - rect.top - fieldY,
      });
    } else if (action === 'resize' && corner) {
      setResizing({ fieldId, corner });
    }
    
    setSelectedFieldId(fieldId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (dragging) {
      const x = ((e.clientX - rect.left - dragging.offsetX) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragging.offsetY) / rect.height) * 100;
      
      updateField(dragging.fieldId, {
        x: Math.max(0, Math.min(90, x)),
        y: Math.max(0, Math.min(95, y)),
      });
    }

    if (resizing) {
      const field = fields.find(f => f.id === resizing.fieldId);
      if (!field) return;

      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

      if (resizing.corner === 'se') {
        const newWidth = Math.max(5, Math.min(50, mouseX - field.x));
        const newHeight = Math.max(3, Math.min(20, mouseY - field.y));
        updateField(resizing.fieldId, { width: newWidth, height: newHeight });
      }
    }
  }, [dragging, resizing, fields]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  };

  const currentPageFields = fields.filter(f => f.page === currentPage);
  const selectedField = fields.find(f => f.id === selectedFieldId);

  const getFieldColor = (type: SignatureField['type']) => {
    return FIELD_TYPES.find(f => f.type === type)?.color || 'bg-gray-500';
  };

  const getFieldLabel = (field: SignatureField) => {
    const typeLabel = FIELD_TYPES.find(f => f.type === field.type)?.label || field.type;
    return `${field.role === 'tenant' ? 'T' : 'L'}: ${typeLabel}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-white">Configure Signature Fields</h2>
            <p className="text-sm text-slate-400">{documentName}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Fields
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Field Tools */}
        <div className="w-64 border-r border-white/10 bg-slate-900/50 p-4 space-y-6 overflow-y-auto">
          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Assign to:</label>
            <div className="flex gap-2">
              {ROLES.map(role => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    selectedRole === role.value
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Add Field:</label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map(fieldType => {
                const Icon = fieldType.icon;
                return (
                  <button
                    key={fieldType.type}
                    onClick={() => addField(fieldType.type)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg transition-colors',
                      'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                    )}
                  >
                    <div className={cn('p-2 rounded', fieldType.color)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs">{fieldType.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field List */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Fields ({fields.length})
            </label>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {fields.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No fields added yet</p>
              ) : (
                fields.map(field => (
                  <div
                    key={field.id}
                    onClick={() => {
                      setSelectedFieldId(field.id);
                      setCurrentPage(field.page);
                    }}
                    className={cn(
                      'flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer',
                      selectedFieldId === field.id
                        ? 'bg-violet-500/20 text-violet-200'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', getFieldColor(field.type))} />
                      {getFieldLabel(field)}
                      <span className="text-slate-500">p.{field.page}</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteField(field.id);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Field Properties */}
          {selectedField && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <label className="text-sm font-medium text-slate-300">Field Properties</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Type:</span>
                  <span className="text-white capitalize">{selectedField.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Role:</span>
                  <select
                    value={selectedField.role}
                    onChange={(e) => updateField(selectedField.id, { role: e.target.value as 'tenant' | 'landlord' })}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="tenant">Tenant</option>
                    <option value="landlord">Landlord</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Page:</span>
                  <span className="text-white">{selectedField.page}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Required:</span>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                    className="rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 leading-relaxed">
              Click a field type to add it to the current page. Drag fields to position them. 
              Drag the corner to resize. Fields will appear at these positions when tenants sign.
            </p>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col bg-slate-800/50">
          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-4 py-3 border-b border-white/10 bg-slate-900/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-300">
              Page {currentPage} of {numPages || '...'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="text-slate-400 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* PDF Page with Fields */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto p-8 flex items-start justify-center"
            onClick={() => setSelectedFieldId(null)}
          >
            <div 
              ref={pageRef}
              className="relative bg-white shadow-2xl"
              style={{ minHeight: '800px' }}
            >
              <Document
                file={documentUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-[800px] w-[600px]">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  onLoadSuccess={onPageLoadSuccess}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={600}
                />
              </Document>

              {/* Signature Fields Overlay */}
              {currentPageFields.map(field => (
                <div
                  key={field.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFieldId(field.id);
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field.id, 'drag')}
                  className={cn(
                    'absolute cursor-move border-2 rounded flex items-center justify-center transition-colors',
                    selectedFieldId === field.id
                      ? 'border-violet-500 bg-violet-500/30'
                      : 'border-slate-400 bg-slate-400/20 hover:border-violet-400',
                    field.role === 'tenant' ? 'border-blue-500' : 'border-violet-500',
                    selectedFieldId === field.id && (field.role === 'tenant' ? 'bg-blue-500/30' : 'bg-violet-500/30')
                  )}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                >
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-700 select-none">
                    <GripVertical className="h-3 w-3 opacity-50" />
                    <span>{getFieldLabel(field)}</span>
                  </div>

                  {/* Resize Handle */}
                  {selectedFieldId === field.id && (
                    <div
                      onMouseDown={(e) => handleMouseDown(e, field.id, 'resize', 'se')}
                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-violet-500 rounded-sm cursor-se-resize"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
