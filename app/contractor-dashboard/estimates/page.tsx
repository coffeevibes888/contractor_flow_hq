'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Plus, FileText, X, Send, Copy, Trash2, ChevronRight, Lightbulb } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
}

interface Estimate {
  id: string;
  title: string;
  description: string | null;
  lineItems: LineItem[];
  laborCost: number;
  materialsCost: number;
  totalAmount: number;
  estimatedHours: number | null;
  status: string;
  isTemplate: boolean;
  templateName: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  landlord?: { name: string; companyName: string | null } | null;
  workOrder?: { title: string; property: { name: string } } | null;
}

const statusConfig: Record<string, { bg: string; text: string }> = {
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-600' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-500' },
  declined: { bg: 'bg-red-50', text: 'text-red-600' },
};

export default function ContractorEstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [templates, setTemplates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', qty: 1, unitPrice: 0 }]);
  const [laborCost, setLaborCost] = useState(0);
  const [materialsCost, setMaterialsCost] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState('');
  const [templateName, setTemplateName] = useState('');

  useEffect(() => { fetchEstimates(); }, []);

  const fetchEstimates = async () => {
    try {
      const [estRes, tempRes] = await Promise.all([
        fetch('/api/contractor/estimates'),
        fetch('/api/contractor/estimates?templates=true'),
      ]);
      if (estRes.ok) setEstimates((await estRes.json()).estimates || []);
      if (tempRes.ok) setTemplates((await tempRes.json()).estimates || []);
    } catch {}
    finally { setLoading(false); }
  };

  const calculateTotal = () =>
    lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0) + laborCost + materialsCost;

  const addLineItem = () => setLineItems([...lineItems, { description: '', qty: 1, unitPrice: 0 }]);
  const removeLineItem = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[i] = { ...updated[i], [field]: value };
    setLineItems(updated);
  };

  const resetForm = () => {
    setTitle(''); setDescription('');
    setLineItems([{ description: '', qty: 1, unitPrice: 0 }]);
    setLaborCost(0); setMaterialsCost(0); setEstimatedHours(''); setTemplateName('');
    setIsTemplate(false); setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title) { toast.error('Please enter a title'); return; }
    try {
      const res = await fetch('/api/contractor/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description,
          lineItems: lineItems.filter((item) => item.description),
          laborCost, materialsCost,
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          isTemplate, templateName: isTemplate ? templateName : null,
        }),
      });
      if (res.ok) { toast.success(isTemplate ? 'Template saved!' : 'Estimate created!'); resetForm(); fetchEstimates(); }
      else toast.error((await res.json()).error || 'Failed to save');
    } catch { toast.error('Failed to save estimate'); }
  };

  const useTemplate = (template: Estimate) => {
    setTitle(template.title); setDescription(template.description || '');
    setLineItems(template.lineItems.length > 0 ? template.lineItems : [{ description: '', qty: 1, unitPrice: 0 }]);
    setLaborCost(template.laborCost); setMaterialsCost(template.materialsCost);
    setEstimatedHours(template.estimatedHours?.toString() || '');
    setIsTemplate(false); setShowForm(true);
  };

  const deleteEstimate = async (id: string) => {
    if (!confirm('Delete this estimate?')) return;
    try {
      const res = await fetch(`/api/contractor/estimates/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Deleted'); fetchEstimates(); }
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500' />
      </div>
    );
  }

  return (
    <div className='w-full space-y-5'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-black'>Estimates</h1>
          <p className='text-xs sm:text-sm text-gray-500 mt-0.5'>Create and manage job quotes</p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={() => { setShowForm(true); setIsTemplate(true); }}
            className='border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm text-xs'
          >
            <FileText className='h-3.5 w-3.5 mr-1.5' />
            New Template
          </Button>
          <Button
            onClick={() => { setShowForm(true); setIsTemplate(false); }}
            className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold'
          >
            <Plus className='h-4 w-4 mr-2' />
            New Estimate
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center justify-between p-4 border-b border-gray-100'>
            <h3 className='text-sm font-bold text-gray-800'>
              {isTemplate ? 'Create Template' : 'New Estimate'}
            </h3>
            <button onClick={resetForm} className='p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors'>
              <X className='h-4 w-4' />
            </button>
          </div>
          <div className='p-4 space-y-4'>
            <div className='flex gap-4'>
              {[{ label: 'Estimate', value: false }, { label: 'Save as Template', value: true }].map(({ label, value }) => (
                <label key={label} className='flex items-center gap-2 cursor-pointer'>
                  <input type='radio' checked={isTemplate === value} onChange={() => setIsTemplate(value)} className='accent-amber-500' />
                  <span className='text-sm text-gray-700'>{label}</span>
                </label>
              ))}
            </div>

            {isTemplate && (
              <Input placeholder="Template name (e.g., 'Standard Plumbing Repair')" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            )}

            <Input placeholder='Estimate title' value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder='Description of work...' value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

            {/* Line Items */}
            <div className='space-y-2'>
              <label className='text-xs font-semibold text-gray-700 uppercase tracking-wide'>Line Items</label>
              {lineItems.map((item, index) => (
                <div key={index} className='flex gap-2'>
                  <Input placeholder='Description' value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} className='flex-1' />
                  <Input type='number' placeholder='Qty' value={item.qty} onChange={(e) => updateLineItem(index, 'qty', Number(e.target.value))} className='w-20' />
                  <Input type='number' placeholder='Price' value={item.unitPrice} onChange={(e) => updateLineItem(index, 'unitPrice', Number(e.target.value))} className='w-28' />
                  <button onClick={() => removeLineItem(index)} disabled={lineItems.length === 1} className='p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors'>
                    <X className='h-4 w-4' />
                  </button>
                </div>
              ))}
              <button onClick={addLineItem} className='flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium'>
                <Plus className='h-3.5 w-3.5' /> Add Line Item
              </button>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div>
                <label className='text-xs text-gray-500 font-medium'>Labor Cost</label>
                <Input type='number' value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} className='mt-1' />
              </div>
              <div>
                <label className='text-xs text-gray-500 font-medium'>Materials Cost</label>
                <Input type='number' value={materialsCost} onChange={(e) => setMaterialsCost(Number(e.target.value))} className='mt-1' />
              </div>
              <div>
                <label className='text-xs text-gray-500 font-medium'>Est. Hours</label>
                <Input type='number' value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} className='mt-1' />
              </div>
            </div>

            <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
              <div className='text-base font-bold text-gray-900'>
                Total: <span className='text-amber-600'>{formatCurrency(calculateTotal())}</span>
              </div>
              <div className='flex gap-2'>
                <Button variant='outline' onClick={resetForm} className='text-xs'>Cancel</Button>
                <Button onClick={handleSubmit} className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold'>
                  {isTemplate ? 'Save Template' : 'Create Estimate'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates */}
      {templates.length > 0 && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex items-center gap-2 p-4 border-b border-gray-100'>
            <FileText className='h-4 w-4 text-amber-500' />
            <h3 className='text-sm font-bold text-gray-800'>My Templates</h3>
          </div>
          <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4'>
            {templates.map((template) => (
              <div key={template.id} className='flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-amber-200 transition-colors'>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold text-gray-800 truncate'>{template.templateName || template.title}</p>
                  <p className='text-[10px] text-gray-500 mt-0.5'>{formatCurrency(template.totalAmount)}</p>
                </div>
                <div className='flex gap-1 shrink-0 ml-2'>
                  <button onClick={() => useTemplate(template)} className='p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors' title='Use template'>
                    <Copy className='h-3.5 w-3.5' />
                  </button>
                  <button onClick={() => deleteEstimate(template.id)} className='p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors'>
                    <Trash2 className='h-3.5 w-3.5' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estimates List */}
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-100'>
          <h3 className='text-sm font-bold text-gray-800'>Your Estimates</h3>
          <span className='text-xs text-gray-400'>{estimates.length} total</span>
        </div>

        {estimates.length === 0 ? (
          <div className='p-10 text-center'>
            <div className='w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center'>
              <Calculator className='h-7 w-7 text-amber-400' />
            </div>
            <h3 className='text-base font-bold text-gray-800 mb-1'>No estimates yet</h3>
            <p className='text-sm text-gray-500 mb-4'>Create estimates to send quotes to property managers and clients.</p>
            <div className='flex gap-2 justify-center'>
              <Button onClick={() => { setShowForm(true); setIsTemplate(false); }} className='bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold'>
                <Plus className='h-4 w-4 mr-2' /> Create Estimate
              </Button>
              <Button variant='outline' onClick={() => { setShowForm(true); setIsTemplate(true); }} className='border-gray-200 text-gray-600'>
                <FileText className='h-4 w-4 mr-2' /> Create Template
              </Button>
            </div>
          </div>
        ) : (
          <div className='divide-y divide-gray-50'>
            {estimates.map((estimate) => {
              const sc = statusConfig[estimate.status] || { bg: 'bg-gray-100', text: 'text-gray-500' };
              return (
                <div key={estimate.id} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors'>
                  <div className='h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0'>
                    <FileText className='h-4 w-4 text-amber-500' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-semibold text-gray-800 truncate'>{estimate.title}</p>
                    <p className='text-[10px] text-gray-500'>
                      {estimate.landlord?.companyName || estimate.landlord?.name || 'No recipient'}
                      {estimate.workOrder && ` · ${estimate.workOrder.title}`}
                    </p>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    <span className='text-xs font-bold text-emerald-600'>{formatCurrency(estimate.totalAmount)}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} capitalize`}>
                      {estimate.status}
                    </span>
                    <button className='p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors'>
                      <Send className='h-3.5 w-3.5' />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className='flex items-start gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50'>
        <div className='p-1.5 rounded-lg bg-amber-100 shrink-0'>
          <Lightbulb className='h-4 w-4 text-amber-600' />
        </div>
        <div>
          <p className='text-xs font-semibold text-amber-800'>Tips for Great Estimates</p>
          <ul className='text-xs text-amber-700 mt-1 space-y-0.5'>
            <li>• Be detailed about materials and labor costs</li>
            <li>• Include a timeline for completion</li>
            <li>• Save templates for common jobs to speed up quoting</li>
            <li>• Offer options at different price points when possible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
