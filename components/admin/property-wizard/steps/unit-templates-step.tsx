'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Bed, Bath, Square, DollarSign, Plus, Trash2, Copy, Edit2, Home, Building, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useWizard } from '../wizard-context';
import { UnitTemplateData } from '../types';
import { useToast } from '@/hooks/use-toast';

interface UnitTemplatesStepProps {
  setValidate: (fn: (() => boolean) | null) => void;
}

const DEFAULT_TEMPLATES: UnitTemplateData[] = [
  { id: 'studio', name: 'Studio', bedrooms: 0, bathrooms: 1, sizeSqFt: 450, baseRent: 1000, amenities: [], images: [] },
  { id: '1br-1ba', name: '1 Bed / 1 Bath', bedrooms: 1, bathrooms: 1, sizeSqFt: 650, baseRent: 1200, amenities: [], images: [] },
  { id: '2br-1ba', name: '2 Bed / 1 Bath', bedrooms: 2, bathrooms: 1, sizeSqFt: 850, baseRent: 1500, amenities: [], images: [] },
  { id: '2br-2ba', name: '2 Bed / 2 Bath', bedrooms: 2, bathrooms: 2, sizeSqFt: 950, baseRent: 1700, amenities: [], images: [] },
  { id: '3br-2ba', name: '3 Bed / 2 Bath', bedrooms: 3, bathrooms: 2, sizeSqFt: 1200, baseRent: 2100, amenities: [], images: [] },
  { id: 'townhome', name: 'Townhome', bedrooms: 2, bathrooms: 2.5, sizeSqFt: 1400, baseRent: 2400, amenities: [], images: [] },
];

export function UnitTemplatesStep({ setValidate }: UnitTemplatesStepProps) {
  const { state, updateFormData } = useWizard();
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<UnitTemplateData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isInitialMount = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates = state.formData.unitTemplates || [];

  // Initialize with default templates if empty
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (templates.length === 0) {
        updateFormData({ unitTemplates: DEFAULT_TEMPLATES });
      }
    }
  }, []);

  // Set validation function
  useEffect(() => {
    const validateFn = (): boolean => {
      return templates.length > 0;
    };
    setValidate(validateFn);
    return () => setValidate(null);
  }, [setValidate, templates.length]);

  const addTemplate = () => {
    setEditingTemplate({
      id: `template-${Date.now()}`,
      name: '',
      bedrooms: 1,
      bathrooms: 1,
      sizeSqFt: undefined,
      baseRent: undefined,
      amenities: [],
      images: [],
    });
    setIsDialogOpen(true);
  };

  const editTemplate = (template: UnitTemplateData) => {
    setEditingTemplate({ ...template, images: template.images || [] });
    setIsDialogOpen(true);
  };

  const saveTemplate = () => {
    if (!editingTemplate || !editingTemplate.name) return;

    const existingIndex = templates.findIndex(t => t.id === editingTemplate.id);
    let newTemplates: UnitTemplateData[];

    if (existingIndex >= 0) {
      newTemplates = [...templates];
      newTemplates[existingIndex] = editingTemplate;
    } else {
      newTemplates = [...templates, editingTemplate];
    }

    updateFormData({ unitTemplates: newTemplates });
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    updateFormData({ unitTemplates: templates.filter(t => t.id !== id) });
  };

  const duplicateTemplate = (template: UnitTemplateData) => {
    const newTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      images: [...(template.images || [])],
    };
    updateFormData({ unitTemplates: [...templates, newTemplate] });
  };

  // Photo upload handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingTemplate) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({ variant: 'destructive', title: 'Invalid file type', description: `${file.name} is not an image` });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({ variant: 'destructive', title: 'File too large', description: `${file.name} exceeds 10MB limit` });
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newImages.push(data.url);
        } else {
          toast({ variant: 'destructive', title: 'Upload failed', description: `Failed to upload ${file.name}` });
        }
      }

      if (newImages.length > 0) {
        setEditingTemplate({
          ...editingTemplate,
          images: [...(editingTemplate.images || []), ...newImages],
        });
        toast({ title: 'Images uploaded', description: `${newImages.length} image(s) added` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload error', description: 'An error occurred while uploading' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeTemplateImage = (index: number) => {
    if (!editingTemplate) return;
    const newImages = editingTemplate.images.filter((_, i) => i !== index);
    setEditingTemplate({ ...editingTemplate, images: newImages });
  };

  // Get icon for template type
  const getTemplateIcon = (template: UnitTemplateData) => {
    if (template.name.toLowerCase().includes('townhome') || template.name.toLowerCase().includes('town home')) {
      return <Building className="h-5 w-5 text-violet-400" />;
    }
    return <Home className="h-5 w-5 text-violet-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Floor Plans & Pricing</h2>
        <p className="text-gray-700 mt-2">
          Define your unit types with pricing - studios, 1BR, 2BR, townhomes, etc.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-4 border border-violet-200">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <span className="text-gray-700">
            <span className="font-semibold text-gray-900">{templates.length}</span> floor plans
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-700">
            Rent range: <span className="font-semibold text-emerald-400">
              ${Math.min(...templates.filter(t => t.baseRent).map(t => t.baseRent!)) || 0} - ${Math.max(...templates.filter(t => t.baseRent).map(t => t.baseRent!)) || 0}/mo
            </span>
          </span>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getTemplateIcon(template)}
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateTemplate(template)}
                  className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editTemplate(template)}
                  className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTemplate(template.id)}
                  className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Price prominently displayed */}
            {template.baseRent && (
              <div className="bg-emerald-500/20 rounded-lg px-3 py-2 mb-3 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  <span className="text-xl font-bold text-emerald-300">${template.baseRent}</span>
                  <span className="text-emerald-400/70 text-sm">/month</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Bed className="h-4 w-4 text-gray-400" />
                <span>{template.bedrooms === 0 ? 'Studio' : `${template.bedrooms} Bed`}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Bath className="h-4 w-4 text-gray-400" />
                <span>{template.bathrooms} Bath</span>
              </div>
              {template.sizeSqFt && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Square className="h-4 w-4 text-gray-400" />
                  <span>{template.sizeSqFt.toLocaleString()} sq ft</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <ImageIcon className="h-4 w-4 text-gray-400" />
                <span>{template.images?.length || 0} photos</span>
              </div>
            </div>
          </div>
        ))}

        {/* Add Template Card */}
        <button
          onClick={addTemplate}
          className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition-all flex flex-col items-center justify-center min-h-[160px]"
        >
          <Plus className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-gray-600 font-medium">Add Floor Plan</span>
          <span className="text-gray-400 text-xs mt-1">Create a new unit type</span>
        </button>
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingTemplate?.name ? 'Edit Floor Plan' : 'New Floor Plan'}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Floor Plan Name <span className="text-red-400">*</span></Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="e.g., 2 Bed / 2 Bath Deluxe"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Pricing - Prominent */}
              <div className="space-y-2">
                <Label className="text-gray-700">Monthly Rent <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                  <Input
                    type="number"
                    value={editingTemplate.baseRent || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, baseRent: parseInt(e.target.value) || undefined })}
                    placeholder="1500"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Bedrooms</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingTemplate.bedrooms}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, bedrooms: parseInt(e.target.value) || 0 })}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                  <p className="text-xs text-gray-400">0 = Studio</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Bathrooms</Label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={editingTemplate.bathrooms}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, bathrooms: parseFloat(e.target.value) || 1 })}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Size (sq ft)</Label>
                <Input
                  type="number"
                  value={editingTemplate.sizeSqFt || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, sizeSqFt: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Photos Section */}
              <div className="space-y-3">
                <Label className="text-gray-700">Floor Plan Photos</Label>
                
                {/* Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                      <span className="text-gray-500">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-500">Click to upload photos</span>
                    </div>
                  )}
                </div>

                {/* Uploaded Images */}
                {editingTemplate.images && editingTemplate.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {editingTemplate.images.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                        <Image src={image} alt={`Photo ${index + 1}`} fill className="object-cover" />
                        <button
                          onClick={() => removeTemplateImage(index)}
                          className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </Button>
            <Button 
              onClick={saveTemplate} 
              disabled={!editingTemplate?.name || !editingTemplate?.baseRent}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Save Floor Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
        <p className="text-sm text-gray-700">
          <strong className="text-gray-900">Next step:</strong> You'll assign these floor plans when generating units.
          Each floor plan's pricing will be applied to its assigned units.
        </p>
      </div>
    </div>
  );
}
