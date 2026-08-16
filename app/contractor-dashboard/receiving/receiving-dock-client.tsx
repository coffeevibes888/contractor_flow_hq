'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Package, MapPin, CheckCircle2, AlertTriangle,
  Plus, Printer, Search, ChevronDown, ChevronUp, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/contractor/barcode-scanner';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  category: string | null;
  quantity: number;
  warehouseZone: string | null;
  warehouseAisle: string | null;
  warehouseShelf: string | null;
  warehouseBin: string | null;
}

interface ReceivingRecord {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string | null;
  itemUnit: string;
  quantityReceived: number;
  quantityExpected: number | null;
  receivedAt: string;
  warehouseZone: string | null;
  warehouseAisle: string | null;
  warehouseShelf: string | null;
  warehouseBin: string | null;
  poNumber: string | null;
  invoiceNumber: string | null;
  qualityChecked: boolean;
  qualityStatus: string | null;
  damageNotes: string | null;
  notes: string | null;
}

interface Props {
  items: InventoryItem[];
  recentReceiving: ReceivingRecord[];
  businessName: string;
}

const locationStr = (r: { warehouseZone?: string | null; warehouseAisle?: string | null; warehouseShelf?: string | null; warehouseBin?: string | null }) => {
  const parts = [
    r.warehouseZone ? `Zone ${r.warehouseZone}` : null,
    r.warehouseAisle ? `Aisle ${r.warehouseAisle}` : null,
    r.warehouseShelf ? `Shelf ${r.warehouseShelf}` : null,
    r.warehouseBin ? `Bin ${r.warehouseBin}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'No location set';
};

export function ReceivingDockClient({ items, recentReceiving, businessName }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lastReceived, setLastReceived] = useState<ReceivingRecord | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  const [form, setForm] = useState({
    itemId: '',
    quantityReceived: '',
    quantityExpected: '',
    poNumber: '',
    invoiceNumber: '',
    packingSlip: '',
    warehouseZone: '',
    warehouseAisle: '',
    warehouseShelf: '',
    warehouseBin: '',
    qualityChecked: false,
    qualityStatus: 'passed',
    damageNotes: '',
    notes: '',
    printLabel: true,
    labelCopies: '1',
  });

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleBarcodeScan = (value: string) => {
    const match = items.find(
      (i) =>
        (i.sku ?? '').toLowerCase() === value.toLowerCase() ||
        i.name.toLowerCase() === value.toLowerCase()
    );
    if (match) {
      setForm((f) => ({ ...f, itemId: match.id }));
      setShowForm(true);
      setSearch(match.name);
    } else {
      setSearch(value);
      setShowForm(true);
    }
  };

  const selectedItem = items.find((i) => i.id === form.itemId);

  const filteredHistory = recentReceiving.filter(
    (r) =>
      r.itemName.toLowerCase().includes(historySearch.toLowerCase()) ||
      (r.itemSku ?? '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (r.poNumber ?? '').toLowerCase().includes(historySearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.itemId || !form.quantityReceived) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/contractor/receiving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: form.itemId,
          quantityReceived: Number(form.quantityReceived),
          quantityExpected: form.quantityExpected ? Number(form.quantityExpected) : undefined,
          poNumber: form.poNumber || undefined,
          invoiceNumber: form.invoiceNumber || undefined,
          packingSlip: form.packingSlip || undefined,
          warehouseZone: form.warehouseZone || undefined,
          warehouseAisle: form.warehouseAisle || undefined,
          warehouseShelf: form.warehouseShelf || undefined,
          warehouseBin: form.warehouseBin || undefined,
          qualityChecked: form.qualityChecked,
          qualityStatus: form.qualityChecked ? form.qualityStatus : undefined,
          damageNotes: form.damageNotes || undefined,
          notes: form.notes || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed');
      const record = await res.json();

      // Print labels if requested
      if (form.printLabel && selectedItem) {
        const labelRes = await fetch('/api/contractor/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labelType: 'receiving',
            itemId: form.itemId,
            itemName: selectedItem.name,
            sku: selectedItem.sku,
            quantity: Number(form.quantityReceived),
            unit: selectedItem.unit,
            warehouseZone: form.warehouseZone || undefined,
            warehouseAisle: form.warehouseAisle || undefined,
            warehouseShelf: form.warehouseShelf || undefined,
            warehouseBin: form.warehouseBin || undefined,
            receivingId: record.id,
            notes: form.notes || undefined,
            copies: Number(form.labelCopies),
          }),
        });

        if (labelRes.ok) {
          const labels = await labelRes.json();
          // Open print window
          printLabels(labels, selectedItem.name, Number(form.quantityReceived), selectedItem.unit, {
            zone: form.warehouseZone,
            aisle: form.warehouseAisle,
            shelf: form.warehouseShelf,
            bin: form.warehouseBin,
          }, businessName);
        }
      }

      setLastReceived({
        id: record.id,
        itemId: form.itemId,
        itemName: selectedItem?.name ?? '',
        itemSku: selectedItem?.sku ?? null,
        itemUnit: selectedItem?.unit ?? '',
        quantityReceived: Number(form.quantityReceived),
        quantityExpected: form.quantityExpected ? Number(form.quantityExpected) : null,
        receivedAt: new Date().toISOString(),
        warehouseZone: form.warehouseZone || null,
        warehouseAisle: form.warehouseAisle || null,
        warehouseShelf: form.warehouseShelf || null,
        warehouseBin: form.warehouseBin || null,
        poNumber: form.poNumber || null,
        invoiceNumber: form.invoiceNumber || null,
        qualityChecked: form.qualityChecked,
        qualityStatus: form.qualityStatus || null,
        damageNotes: form.damageNotes || null,
        notes: form.notes || null,
      });

      setForm({
        itemId: '', quantityReceived: '', quantityExpected: '', poNumber: '',
        invoiceNumber: '', packingSlip: '', warehouseZone: '', warehouseAisle: '',
        warehouseShelf: '', warehouseBin: '', qualityChecked: false, qualityStatus: 'passed',
        damageNotes: '', notes: '', printLabel: true, labelCopies: '1',
      });
      setSearch('');
      setShowForm(false);
      router.refresh();
    } catch {
      alert('Failed to record receiving. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-cyan-600" />
            Receiving Dock
          </h1>
          <p className="text-sm text-slate-500 mt-1">Record incoming materials and assign them to warehouse locations</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Receive Items
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {lastReceived && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">
              ✓ Received {lastReceived.quantityReceived} {lastReceived.itemUnit} of {lastReceived.itemName}
            </p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Stored at: {locationStr(lastReceived)}
            </p>
          </div>
          <button onClick={() => setLastReceived(null)} className="text-emerald-400 hover:text-emerald-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Receive Form */}
      {showForm && (
        <div className="rounded-2xl border-2 border-cyan-200 bg-white shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Receiving Form
            </h2>
          </div>
          <div className="p-6 space-y-6">

            {/* Item Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Item *</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border-2 border-slate-200 rounded-lg divide-y divide-slate-100">
                {filteredItems.length === 0 && (
                  <p className="p-3 text-sm text-slate-400 text-center">No items found</p>
                )}
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        itemId: item.id,
                        warehouseZone: item.warehouseZone ?? '',
                        warehouseAisle: item.warehouseAisle ?? '',
                        warehouseShelf: item.warehouseShelf ?? '',
                        warehouseBin: item.warehouseBin ?? '',
                      }));
                      setSearch('');
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-cyan-50 transition-colors ${
                      form.itemId === item.id ? 'bg-cyan-100 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-900">{item.name}</span>
                        {item.sku && <span className="text-xs text-slate-400 ml-2">SKU: {item.sku}</span>}
                      </div>
                      <span className="text-xs text-slate-500">{item.quantity} {item.unit} on hand</span>
                    </div>
                    {(item.warehouseZone || item.warehouseAisle) && (
                      <p className="text-xs text-cyan-600 mt-0.5">{locationStr(item)}</p>
                    )}
                  </button>
                ))}
              </div>
              {selectedItem && (
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">Selected: {selectedItem.name}</span>
                </div>
              )}
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity Received *</label>
                <Input
                  type="number"
                  min="1"
                  value={form.quantityReceived}
                  onChange={(e) => setForm((f) => ({ ...f, quantityReceived: e.target.value }))}
                  placeholder="e.g. 20000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity Expected</label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantityExpected}
                  onChange={(e) => setForm((f) => ({ ...f, quantityExpected: e.target.value }))}
                  placeholder="e.g. 20000"
                />
              </div>
            </div>

            {/* Reference Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">PO Number</label>
                <Input
                  value={form.poNumber}
                  onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))}
                  placeholder="PO-0001"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Invoice Number</label>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                  placeholder="INV-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Packing Slip</label>
                <Input
                  value={form.packingSlip}
                  onChange={(e) => setForm((f) => ({ ...f, packingSlip: e.target.value }))}
                  placeholder="PS-00001"
                />
              </div>
            </div>

            {/* Warehouse Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-cyan-600" />
                Storage Location — Where are you putting this?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Zone</label>
                  <Input
                    value={form.warehouseZone}
                    onChange={(e) => setForm((f) => ({ ...f, warehouseZone: e.target.value }))}
                    placeholder="e.g. A, B, North"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Aisle</label>
                  <Input
                    value={form.warehouseAisle}
                    onChange={(e) => setForm((f) => ({ ...f, warehouseAisle: e.target.value }))}
                    placeholder="e.g. 1, 2, 3"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Shelf</label>
                  <Input
                    value={form.warehouseShelf}
                    onChange={(e) => setForm((f) => ({ ...f, warehouseShelf: e.target.value }))}
                    placeholder="e.g. A, B, C"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Bin</label>
                  <Input
                    value={form.warehouseBin}
                    onChange={(e) => setForm((f) => ({ ...f, warehouseBin: e.target.value }))}
                    placeholder="e.g. 1, 2, 3"
                  />
                </div>
              </div>
              {(form.warehouseZone || form.warehouseAisle || form.warehouseShelf || form.warehouseBin) && (
                <p className="mt-2 text-xs text-cyan-700 font-medium">
                  📍 Will be stored at: {locationStr(form)}
                </p>
              )}
            </div>

            {/* Quality Check */}
            <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="qualityChecked"
                  checked={form.qualityChecked}
                  onChange={(e) => setForm((f) => ({ ...f, qualityChecked: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="qualityChecked" className="text-sm font-semibold text-slate-700">
                  Quality check performed
                </label>
              </div>
              {form.qualityChecked && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Quality Status</label>
                    <select
                      value={form.qualityStatus}
                      onChange={(e) => setForm((f) => ({ ...f, qualityStatus: e.target.value }))}
                      className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="partial">Partial — some damage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Damage Notes</label>
                    <Input
                      value={form.damageNotes}
                      onChange={(e) => setForm((f) => ({ ...f, damageNotes: e.target.value }))}
                      placeholder="Describe any damage..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Any additional notes about this receipt..."
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Print Labels */}
            <div className="rounded-xl border-2 border-cyan-100 bg-cyan-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="printLabel"
                  checked={form.printLabel}
                  onChange={(e) => setForm((f) => ({ ...f, printLabel: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="printLabel" className="text-sm font-semibold text-cyan-800 flex items-center gap-1">
                  <Printer className="h-4 w-4" />
                  Print storage labels after receiving
                </label>
              </div>
              {form.printLabel && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-cyan-700 font-medium">Number of label copies:</label>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={form.labelCopies}
                    onChange={(e) => setForm((f) => ({ ...f, labelCopies: e.target.value }))}
                    className="w-20"
                  />
                  <span className="text-xs text-cyan-600">e.g. 1 per pallet, or 1 per bag</span>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.itemId || !form.quantityReceived}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-2.5"
              >
                {submitting ? 'Recording...' : '✓ Record Receipt'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Receiving History */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            Receiving History
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredHistory.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">No receiving records yet.</div>
          )}
          {filteredHistory.map((r) => (
            <div key={r.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{r.itemName}</span>
                    {r.itemSku && <span className="text-xs text-slate-400">SKU: {r.itemSku}</span>}
                    {r.qualityChecked && (
                      <Badge className={
                        r.qualityStatus === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                        r.qualityStatus === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {r.qualityStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-cyan-500" />
                    {locationStr(r)}
                  </p>
                  {r.poNumber && <p className="text-xs text-slate-400">PO: {r.poNumber}</p>}
                  {r.damageNotes && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {r.damageNotes}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900 text-lg">
                    {r.quantityReceived} <span className="text-sm font-normal text-slate-500">{r.itemUnit}</span>
                  </p>
                  {r.quantityExpected && r.quantityExpected !== r.quantityReceived && (
                    <p className="text-xs text-amber-600">Expected: {r.quantityExpected}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    {new Date(r.receivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Print helper — opens a new window with print-ready label HTML
function printLabels(
  labels: Array<{ labelNumber: string }>,
  itemName: string,
  qty: number,
  unit: string,
  location: { zone?: string; aisle?: string; shelf?: string; bin?: string },
  businessName: string
) {
  const locationLine = [
    location.zone ? `Zone ${location.zone}` : null,
    location.aisle ? `Aisle ${location.aisle}` : null,
    location.shelf ? `Shelf ${location.shelf}` : null,
    location.bin ? `Bin ${location.bin}` : null,
  ].filter(Boolean).join(' / ') || 'No location';

  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const labelHtml = labels.map((l) => `
    <div class="label">
      <div class="company">${businessName}</div>
      <div class="item-name">${itemName}</div>
      <div class="label-number">${l.labelNumber}</div>
      <div class="detail">Qty: <strong>${qty} ${unit}</strong></div>
      <div class="location">📍 ${locationLine}</div>
      <div class="date">Received: ${date}</div>
    </div>
  `).join('');

  const win = window.open('', '_blank', 'width=600,height=800');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receiving Labels — ${businessName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #fff; }
        .label {
          width: 4in;
          height: 3in;
          border: 2px solid #000;
          border-radius: 8px;
          padding: 14px 18px;
          margin: 10px auto;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .company { font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .item-name { font-size: 20px; font-weight: 900; color: #111; margin: 4px 0; line-height: 1.2; }
        .label-number { font-size: 28px; font-weight: 900; color: #000; font-family: 'Courier New', monospace; border: 2px solid #000; text-align: center; padding: 4px 8px; border-radius: 4px; letter-spacing: 0.12em; margin: 6px 0; }
        .detail { font-size: 14px; font-weight: bold; color: #333; }
        .location { font-size: 13px; font-weight: bold; color: #1d6fa5; background: #e8f4fd; padding: 4px 8px; border-radius: 4px; margin: 4px 0; }
        .date { font-size: 10px; color: #888; }
        @media print {
          body { margin: 0; }
          .label { margin: 0; border-radius: 0; page-break-after: always; }
          @page { size: 4in 3in; margin: 0; }
        }
      </style>
    </head>
    <body>
      ${labelHtml}
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `);
  win.document.close();
}
