'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tag, Plus, Printer, Settings, Search, Trash2,
  CheckCircle2, MapPin, Hash, Package, ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import BarcodeScanner from '@/components/shared/barcode-scanner';

interface LabelConfig {
  id: string;
  name: string;
  labelType: string;
  isDefault: boolean;
  prefix: string | null;
  suffix: string | null;
  sequenceType: string;
  currentSeq: number;
  padLength: number;
  startAt: number;
  showLogo: boolean;
  showBarcode: boolean;
  showLocation: boolean;
  showDate: boolean;
  showQty: boolean;
  showItemName: boolean;
  showSku: boolean;
  showNotes: boolean;
  labelSize: string;
  copies: number;
}

interface LabelRecord {
  id: string;
  labelNumber: string;
  labelType: string;
  itemName: string | null;
  sku: string | null;
  quantity: number | null;
  unit: string | null;
  warehouseZone: string | null;
  warehouseAisle: string | null;
  warehouseShelf: string | null;
  warehouseBin: string | null;
  status: string;
  printedAt: string;
  configName: string | null;
  description: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  warehouseZone: string | null;
  warehouseAisle: string | null;
  warehouseShelf: string | null;
  warehouseBin: string | null;
}

interface Props {
  configs: LabelConfig[];
  recentLabels: LabelRecord[];
  items: InventoryItem[];
  businessName: string;
}

const SEQ_PREVIEW = (c: LabelConfig) => {
  const pad = (n: number) => String(n).padStart(c.padLength, '0');
  if (c.sequenceType === 'random') return `${c.prefix ?? ''}A3K7Z9M2${c.suffix ?? ''}`;
  if (c.sequenceType === 'date_prefix') return `${c.prefix ?? ''}20260418-${pad(c.startAt)}${c.suffix ?? ''}`;
  return `${c.prefix ?? ''}${pad(c.startAt)}${c.suffix ?? ''}`;
};

const locationStr = (r: { warehouseZone?: string | null; warehouseAisle?: string | null; warehouseShelf?: string | null; warehouseBin?: string | null }) => {
  const parts = [
    r.warehouseZone ? `Zone ${r.warehouseZone}` : null,
    r.warehouseAisle ? `Aisle ${r.warehouseAisle}` : null,
    r.warehouseShelf ? `Shelf ${r.warehouseShelf}` : null,
    r.warehouseBin ? `Bin ${r.warehouseBin}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : '';
};

const TYPE_COLORS: Record<string, string> = {
  storage: 'bg-cyan-100 text-cyan-700',
  shipping: 'bg-violet-100 text-violet-700',
  receiving: 'bg-emerald-100 text-emerald-700',
  item: 'bg-amber-100 text-amber-700',
};

const emptyConfig = (): Omit<LabelConfig, 'id' | 'currentSeq'> => ({
  name: '',
  labelType: 'storage',
  isDefault: false,
  prefix: '',
  suffix: '',
  sequenceType: 'sequential',
  padLength: 4,
  startAt: 1,
  showLogo: true,
  showBarcode: true,
  showLocation: true,
  showDate: true,
  showQty: true,
  showItemName: true,
  showSku: true,
  showNotes: false,
  labelSize: '4x6',
  copies: 1,
});

export function LabelsClient({ configs: initialConfigs, recentLabels, items, businessName }: Props) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [activeTab, setActiveTab] = useState<'print' | 'configs' | 'history'>('print');
  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Config editor
  const [editingConfig, setEditingConfig] = useState<(Partial<LabelConfig> & { isNew?: boolean }) | null>(null);

  // Print form
  const [printForm, setPrintForm] = useState({
    configId: initialConfigs[0]?.id ?? '',
    itemId: '',
    labelType: 'storage',
    itemSearch: '',
    description: '',
    quantity: '',
    unit: '',
    warehouseZone: '',
    warehouseAisle: '',
    warehouseShelf: '',
    warehouseBin: '',
    notes: '',
    copies: '1',
  });
  const [printing, setPrinting] = useState(false);
  const [lastPrinted, setLastPrinted] = useState<LabelRecord[] | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // When a code is scanned, try to match it to an inventory item by SKU,
  // otherwise treat it as a description fill.
  const handleScannedCode = (value: string) => {
    const matchedItem = items.find(
      (i) => i.sku?.toLowerCase() === value.toLowerCase() || i.name.toLowerCase() === value.toLowerCase()
    );
    if (matchedItem) {
      setPrintForm((f) => ({
        ...f,
        itemId: matchedItem.id,
        unit: matchedItem.unit,
        warehouseZone: matchedItem.warehouseZone ?? '',
        warehouseAisle: matchedItem.warehouseAisle ?? '',
        warehouseShelf: matchedItem.warehouseShelf ?? '',
        warehouseBin: matchedItem.warehouseBin ?? '',
        itemSearch: '',
        description: f.description || matchedItem.name,
      }));
    } else {
      setPrintForm((f) => ({ ...f, description: value }));
    }
    setScannerOpen(false);
  };

  const selectedConfig = configs.find((c) => c.id === printForm.configId);
  const selectedItem = items.find((i) => i.id === printForm.itemId);

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(printForm.itemSearch.toLowerCase()) ||
      (i.sku ?? '').toLowerCase().includes(printForm.itemSearch.toLowerCase())
  );

  const handlePrint = async () => {
    if (!printForm.copies || Number(printForm.copies) < 1) return;
    setPrinting(true);
    try {
      const res = await fetch('/api/contractor/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: printForm.configId || undefined,
          itemId: printForm.itemId || undefined,
          labelType: printForm.labelType,
          description: printForm.description || undefined,
          itemName: selectedItem?.name || undefined,
          sku: selectedItem?.sku || undefined,
          quantity: printForm.quantity ? Number(printForm.quantity) : undefined,
          unit: printForm.unit || selectedItem?.unit || undefined,
          warehouseZone: printForm.warehouseZone || undefined,
          warehouseAisle: printForm.warehouseAisle || undefined,
          warehouseShelf: printForm.warehouseShelf || undefined,
          warehouseBin: printForm.warehouseBin || undefined,
          notes: printForm.notes || undefined,
          copies: Number(printForm.copies),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const labels: LabelRecord[] = await res.json();
      setLastPrinted(labels);
      openPrintWindow(labels, selectedConfig, selectedItem, printForm, businessName);
      router.refresh();
    } catch {
      alert('Failed to generate labels.');
    } finally {
      setPrinting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!editingConfig?.name || !editingConfig.labelType) return;
    setSaving(true);
    try {
      const isNew = editingConfig.isNew;
      const url = isNew ? '/api/contractor/label-configs' : `/api/contractor/label-configs/${editingConfig.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      });
      if (!res.ok) throw new Error('Failed');
      const saved = await res.json();
      if (isNew) {
        setConfigs((prev) => [...prev, saved]);
      } else {
        setConfigs((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      }
      setEditingConfig(null);
      router.refresh();
    } catch {
      alert('Failed to save config.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Delete this label config?')) return;
    await fetch(`/api/contractor/label-configs/${id}`, { method: 'DELETE' });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScannedCode}
        title='Scan to fill label'
        description='Scan an item barcode or QR code to auto-populate this print form.'
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-violet-600" />
            Label Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">Print storage, shipping, and receiving labels with custom number sequences</p>
        </div>
        <Button
          onClick={() => setScannerOpen(true)}
          className='bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm'
        >
          <ScanLine className='h-4 w-4 mr-1.5' />
          Scan Item
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-slate-200">
        {(['print', 'configs', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold capitalize rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-white border-2 border-b-0 border-slate-200 text-violet-700 -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'print' ? '🖨 Print Labels' : tab === 'configs' ? '⚙ Label Formats' : '📋 History'}
          </button>
        ))}
      </div>

      {/* PRINT TAB */}
      {activeTab === 'print' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Form */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-slate-900">Generate Labels</h2>

            {/* Label Format */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Label Format</label>
              {configs.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
                  No formats yet —{' '}
                  <button onClick={() => setActiveTab('configs')} className="text-violet-600 underline">
                    create one first
                  </button>
                </div>
              ) : (
                <select
                  value={printForm.configId}
                  onChange={(e) => {
                    const c = configs.find((x) => x.id === e.target.value);
                    setPrintForm((f) => ({ ...f, configId: e.target.value, labelType: c?.labelType ?? f.labelType }));
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="">— No format (auto-number) —</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isDefault ? '(default)' : ''} — preview: {SEQ_PREVIEW(c)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Label Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Label Type</label>
              <div className="flex flex-wrap gap-2">
                {(['storage', 'shipping', 'receiving', 'item'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPrintForm((f) => ({ ...f, labelType: t }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors capitalize ${
                      printForm.labelType === t
                        ? TYPE_COLORS[t] + ' border-current'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Item */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Item (optional)</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search inventory items..."
                  value={printForm.itemSearch}
                  onChange={(e) => setPrintForm((f) => ({ ...f, itemSearch: e.target.value }))}
                  className="pl-9"
                />
              </div>
              {printForm.itemSearch && (
                <div className="max-h-40 overflow-y-auto border-2 border-slate-100 rounded-lg divide-y divide-slate-50">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setPrintForm((f) => ({
                          ...f,
                          itemId: item.id,
                          unit: item.unit,
                          warehouseZone: item.warehouseZone ?? '',
                          warehouseAisle: item.warehouseAisle ?? '',
                          warehouseShelf: item.warehouseShelf ?? '',
                          warehouseBin: item.warehouseBin ?? '',
                          itemSearch: '',
                        }));
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors"
                    >
                      <span className="font-medium">{item.name}</span>
                      {item.sku && <span className="text-slate-400 ml-2 text-xs">SKU: {item.sku}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedItem && (
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-emerald-700 font-medium">{selectedItem.name}</span>
                  <button onClick={() => setPrintForm((f) => ({ ...f, itemId: '' }))} className="text-slate-400 hover:text-red-500 text-xs ml-2">
                    clear
                  </button>
                </div>
              )}
            </div>

            {/* Qty + Description */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity on Label</label>
                <Input
                  type="number"
                  min="0"
                  value={printForm.quantity}
                  onChange={(e) => setPrintForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 20000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Unit</label>
                <Input
                  value={printForm.unit}
                  onChange={(e) => setPrintForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="bags, pallets, boxes..."
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-cyan-600" /> Storage Location
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['warehouseZone', 'warehouseAisle', 'warehouseShelf', 'warehouseBin'] as const).map((field, i) => (
                  <div key={field}>
                    <label className="block text-xs text-slate-400 mb-1">{['Zone', 'Aisle', 'Shelf', 'Bin'][i]}</label>
                    <Input
                      value={printForm[field]}
                      onChange={(e) => setPrintForm((f) => ({ ...f, [field]: e.target.value }))}
                      placeholder={['A', '1', 'B', '3'][i]}
                    />
                  </div>
                ))}
              </div>
              {locationStr(printForm) && (
                <p className="mt-1.5 text-xs text-cyan-700 font-medium">📍 {locationStr(printForm)}</p>
              )}
            </div>

            {/* Description + Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <Input
                  value={printForm.description}
                  onChange={(e) => setPrintForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Concrete bags — April delivery"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notes on label</label>
                <Input
                  value={printForm.notes}
                  onChange={(e) => setPrintForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions..."
                />
              </div>
            </div>

            {/* Copies + Print */}
            <div className="flex items-end gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  <Hash className="inline h-3.5 w-3.5 mr-1" />Number of copies
                </label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={printForm.copies}
                  onChange={(e) => setPrintForm((f) => ({ ...f, copies: e.target.value }))}
                  className="w-28"
                />
              </div>
              <Button
                onClick={handlePrint}
                disabled={printing || Number(printForm.copies) < 1}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-2.5"
              >
                <Printer className="h-4 w-4 mr-2" />
                {printing ? 'Generating...' : `Print ${printForm.copies} Label${Number(printForm.copies) > 1 ? 's' : ''}`}
              </Button>
            </div>

            {lastPrinted && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ {lastPrinted.length} label{lastPrinted.length > 1 ? 's' : ''} generated: {lastPrinted[0]?.labelNumber}{lastPrinted.length > 1 ? ` … ${lastPrinted[lastPrinted.length - 1]?.labelNumber}` : ''}
              </div>
            )}
          </div>

          {/* Preview panel */}
          {selectedConfig && (
            <div>
              <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 sticky top-4">
                <h3 className="font-bold text-violet-800 mb-4 text-sm uppercase tracking-wide">Label Preview</h3>
                <div className="bg-white border-2 border-slate-800 rounded-xl p-4 shadow-lg space-y-2 font-mono">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{businessName}</p>
                  {selectedConfig.showItemName && (
                    <p className="text-base font-black text-slate-900 leading-tight">
                      {selectedItem?.name ?? printForm.description ?? 'Item Name'}
                    </p>
                  )}
                  <div className="border-2 border-slate-900 rounded text-center py-2 my-2">
                    <span className="text-xl font-black tracking-widest">{SEQ_PREVIEW(selectedConfig)}</span>
                  </div>
                  {selectedConfig.showQty && (
                    <p className="text-sm font-bold">Qty: {printForm.quantity || '—'} {printForm.unit || selectedItem?.unit || ''}</p>
                  )}
                  {selectedConfig.showLocation && locationStr(printForm) && (
                    <p className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-1 rounded">
                      📍 {locationStr(printForm)}
                    </p>
                  )}
                  {selectedConfig.showDate && (
                    <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString()}</p>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-xs text-violet-700">
                  <p>Format: <strong>{selectedConfig.sequenceType}</strong></p>
                  <p>Size: <strong>{selectedConfig.labelSize}</strong></p>
                  <p>Counter at: <strong>{selectedConfig.currentSeq}</strong></p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIGS TAB */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{configs.length} format{configs.length !== 1 ? 's' : ''} configured</p>
            <Button
              onClick={() => setEditingConfig({ ...emptyConfig(), isNew: true })}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> New Format
            </Button>
          </div>

          {/* Config editor modal inline */}
          {editingConfig && (
            <div className="rounded-2xl border-2 border-violet-200 bg-white shadow-lg p-6 space-y-5">
              <h3 className="font-bold text-violet-900 text-lg">
                {editingConfig.isNew ? 'New Label Format' : `Edit: ${editingConfig.name}`}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Format Name *</label>
                  <Input
                    value={editingConfig.name ?? ''}
                    onChange={(e) => setEditingConfig((c) => c ? { ...c, name: e.target.value } : c)}
                    placeholder="e.g. Warehouse Storage Label"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Label Type *</label>
                  <select
                    value={editingConfig.labelType ?? 'storage'}
                    onChange={(e) => setEditingConfig((c) => c ? { ...c, labelType: e.target.value } : c)}
                    className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="storage">Storage</option>
                    <option value="shipping">Shipping</option>
                    <option value="receiving">Receiving</option>
                    <option value="item">Item</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4 space-y-4">
                <p className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                  <Hash className="h-4 w-4" /> Number Sequence
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Sequence Type</label>
                    <select
                      value={editingConfig.sequenceType ?? 'sequential'}
                      onChange={(e) => setEditingConfig((c) => c ? { ...c, sequenceType: e.target.value } : c)}
                      className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="sequential">Sequential (0001, 0002, 0003…)</option>
                      <option value="random">Random (A3K7Z9M2…)</option>
                      <option value="date_prefix">Date Prefix (20260418-0001…)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Label Size</label>
                    <select
                      value={editingConfig.labelSize ?? '4x6'}
                      onChange={(e) => setEditingConfig((c) => c ? { ...c, labelSize: e.target.value } : c)}
                      className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="4x6">4×6 in (standard thermal)</option>
                      <option value="4x4">4×4 in</option>
                      <option value="3x2">3×2 in (small)</option>
                      <option value="letter">Letter (8.5×11)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Prefix</label>
                    <Input
                      value={editingConfig.prefix ?? ''}
                      onChange={(e) => setEditingConfig((c) => c ? { ...c, prefix: e.target.value } : c)}
                      placeholder="e.g. CON-"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Suffix</label>
                    <Input
                      value={editingConfig.suffix ?? ''}
                      onChange={(e) => setEditingConfig((c) => c ? { ...c, suffix: e.target.value } : c)}
                      placeholder="e.g. -2026"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Start at #</label>
                    <Input
                      type="number"
                      min="0"
                      value={editingConfig.startAt ?? 1}
                      onChange={(e) => setEditingConfig((c) => c ? { ...c, startAt: Number(e.target.value) } : c)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Zero-pad to</label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={editingConfig.padLength ?? 4}
                      onChange={(e) => setEditingConfig((c) => c ? { ...c, padLength: Number(e.target.value) } : c)}
                    />
                  </div>
                </div>
                {editingConfig.sequenceType !== 'random' && (
                  <p className="text-xs text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg">
                    Preview: <strong>{SEQ_PREVIEW(editingConfig as LabelConfig)}</strong>
                  </p>
                )}
              </div>

              {/* What shows on label */}
              <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
                <p className="font-semibold text-slate-700 text-sm mb-3">What appears on the label</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    ['showItemName', 'Item Name'],
                    ['showSku', 'SKU'],
                    ['showQty', 'Quantity'],
                    ['showLocation', 'Location'],
                    ['showDate', 'Date'],
                    ['showBarcode', 'Barcode area'],
                    ['showLogo', 'Company name'],
                    ['showNotes', 'Notes'],
                  ] as const).map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!(editingConfig as any)[field]}
                        onChange={(e) => setEditingConfig((c) => c ? { ...c, [field]: e.target.checked } : c)}
                        className="h-3.5 w-3.5 rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={!!editingConfig.isDefault}
                  onChange={(e) => setEditingConfig((c) => c ? { ...c, isDefault: e.target.checked } : c)}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="isDefault" className="text-sm font-semibold text-slate-700">
                  Set as default for this label type
                </label>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {saving ? 'Saving...' : editingConfig.isNew ? 'Create Format' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setEditingConfig(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Configs list */}
          {configs.length === 0 && !editingConfig && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-slate-400">
              <Settings className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No label formats yet</p>
              <p className="text-sm mt-1">Create a format to define your number sequences and label layout</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((c) => (
              <div key={c.id} className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:border-violet-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-bold text-slate-900">{c.name}</span>
                    {c.isDefault && <Badge className="ml-2 bg-violet-100 text-violet-700">Default</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingConfig(c)} className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                      <Settings className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteConfig(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <Badge className={TYPE_COLORS[c.labelType]}>{c.labelType}</Badge>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>Sequence: <span className="font-medium text-slate-700">{c.sequenceType}</span></p>
                  <p>Preview: <span className="font-mono font-bold text-violet-700">{SEQ_PREVIEW(c)}</span></p>
                  <p>Size: <span className="font-medium text-slate-700">{c.labelSize}</span></p>
                  <p>Counter: <span className="font-medium text-slate-700">{c.currentSeq} labels printed</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-400" /> Label History
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search labels..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLabels
              .filter((l) =>
                (l.labelNumber ?? '').toLowerCase().includes(historySearch.toLowerCase()) ||
                (l.itemName ?? '').toLowerCase().includes(historySearch.toLowerCase()) ||
                (l.sku ?? '').toLowerCase().includes(historySearch.toLowerCase())
              )
              .map((l) => (
                <div key={l.id} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="font-mono font-bold text-slate-900 text-sm shrink-0">{l.labelNumber}</div>
                    <div className="min-w-0">
                      {l.itemName && <p className="text-sm text-slate-700 truncate">{l.itemName}</p>}
                      {l.description && <p className="text-xs text-slate-400 truncate">{l.description}</p>}
                      {locationStr(l) && (
                        <p className="text-xs text-cyan-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {locationStr(l)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={TYPE_COLORS[l.labelType] ?? 'bg-slate-100 text-slate-700'}>{l.labelType}</Badge>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(l.printedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function openPrintWindow(
  labels: Array<{ labelNumber: string }>,
  config: LabelConfig | undefined,
  item: InventoryItem | undefined,
  form: { labelType: string; quantity: string; unit: string; description: string; notes: string; warehouseZone: string; warehouseAisle: string; warehouseShelf: string; warehouseBin: string },
  businessName: string
) {
  const loc = locationStr(form);
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const itemName = item?.name ?? form.description ?? '';
  const sku = item?.sku ?? '';
  const qty = form.quantity ? `${form.quantity} ${form.unit || item?.unit || ''}` : '';
  const size = config?.labelSize ?? '4x6';

  const dims: Record<string, string> = {
    '4x6': '4in 6in',
    '4x4': '4in 4in',
    '3x2': '3in 2in',
    letter: '8.5in 11in',
  };

  const labelHtml = labels.map((l) => `
    <div class="label">
      ${config?.showLogo !== false ? `<div class="company">${businessName}</div>` : ''}
      ${config?.showItemName !== false && itemName ? `<div class="item-name">${itemName}</div>` : ''}
      ${sku && config?.showSku !== false ? `<div class="sku">SKU: ${sku}</div>` : ''}
      <div class="label-number">${l.labelNumber}</div>
      ${qty && config?.showQty !== false ? `<div class="detail">Qty: <strong>${qty}</strong></div>` : ''}
      ${loc && config?.showLocation !== false ? `<div class="location">📍 ${loc}</div>` : ''}
      ${form.notes && config?.showNotes ? `<div class="notes">${form.notes}</div>` : ''}
      ${config?.showDate !== false ? `<div class="date">${date}</div>` : ''}
    </div>
  `).join('');

  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Labels — ${businessName}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; background:#fff; }
      .label { width:${size.split(' ')[0] ?? '4in'}; border:2px solid #000; border-radius:6px; padding:12px 16px; margin:8px auto; page-break-after:always; display:flex; flex-direction:column; gap:4px; }
      .company { font-size:10px; font-weight:bold; color:#666; text-transform:uppercase; letter-spacing:.1em; }
      .item-name { font-size:18px; font-weight:900; color:#111; line-height:1.2; }
      .sku { font-size:10px; color:#888; }
      .label-number { font-size:26px; font-weight:900; color:#000; font-family:'Courier New',monospace; border:2px solid #000; text-align:center; padding:4px 8px; border-radius:4px; letter-spacing:.12em; margin:6px 0; }
      .detail { font-size:13px; font-weight:bold; color:#333; }
      .location { font-size:12px; font-weight:bold; color:#1d6fa5; background:#e8f4fd; padding:3px 8px; border-radius:4px; }
      .notes { font-size:10px; color:#555; font-style:italic; }
      .date { font-size:9px; color:#aaa; }
      @media print { body{margin:0;} .label{margin:0;page-break-after:always;border-radius:0;} @page{size:${dims[size] ?? '4in 6in'};margin:0;} }
    </style></head><body>${labelHtml}
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
  win.document.close();
}
