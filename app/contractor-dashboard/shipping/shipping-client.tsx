'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Plus, Search, Printer, Package,
  MapPin, CheckCircle2, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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

interface ShipmentLine {
  itemId: string;
  itemName: string;
  unit: string;
  sku: string | null;
  quantity: number;
  fromZone: string;
  fromAisle: string;
  fromShelf: string;
  fromBin: string;
}

interface ShipmentRecord {
  id: string;
  shipmentNumber: string;
  status: string;
  destinationName: string | null;
  destinationAddress: string | null;
  destinationType: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  shipDate: string | null;
  createdAt: string;
  itemCount: number;
  lineCount: number;
  items: Array<{
    id: string;
    itemName: string;
    sku: string | null;
    unit: string;
    quantityShipped: number;
    fromZone: string | null;
    fromAisle: string | null;
    fromShelf: string | null;
    fromBin: string | null;
  }>;
}

interface Props {
  items: InventoryItem[];
  shipments: ShipmentRecord[];
  businessName: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  packed: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const locStr = (r: { warehouseZone?: string | null; warehouseAisle?: string | null; warehouseShelf?: string | null; warehouseBin?: string | null }) => {
  const parts = [
    r.warehouseZone ? `Zone ${r.warehouseZone}` : null,
    r.warehouseAisle ? `Aisle ${r.warehouseAisle}` : null,
    r.warehouseShelf ? `Shelf ${r.warehouseShelf}` : null,
    r.warehouseBin ? `Bin ${r.warehouseBin}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : null;
};

export function ShippingClient({ items, shipments: initialShipments, businessName }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedShipment, setExpandedShipment] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const [form, setForm] = useState({
    destinationType: 'job_site',
    destinationName: '',
    destinationAddress: '',
    fromWarehouseZone: '',
    carrier: '',
    trackingNumber: '',
    shipDate: '',
    notes: '',
  });
  const [lines, setLines] = useState<ShipmentLine[]>([]);

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.sku ?? '').toLowerCase().includes(itemSearch.toLowerCase())
  );

  const addLine = (item: InventoryItem) => {
    if (lines.find((l) => l.itemId === item.id)) return;
    setLines((prev) => [
      ...prev,
      {
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        sku: item.sku,
        quantity: 1,
        fromZone: item.warehouseZone ?? '',
        fromAisle: item.warehouseAisle ?? '',
        fromShelf: item.warehouseShelf ?? '',
        fromBin: item.warehouseBin ?? '',
      },
    ]);
    setItemSearch('');
  };

  const updateLine = (itemId: string, field: keyof ShipmentLine, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, [field]: value } : l)));
  };

  const removeLine = (itemId: string) => setLines((prev) => prev.filter((l) => l.itemId !== itemId));

  const handleSubmit = async (printAfter: boolean) => {
    if (lines.length === 0 || !form.destinationName) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/contractor/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shipDate: form.shipDate || undefined,
          items: lines.map((l) => ({
            itemId: l.itemId,
            quantityShipped: l.quantity,
            unit: l.unit,
            fromZone: l.fromZone || undefined,
            fromAisle: l.fromAisle || undefined,
            fromShelf: l.fromShelf || undefined,
            fromBin: l.fromBin || undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const shipment = await res.json();

      if (printAfter) {
        printShippingLabels(shipment, lines, form.destinationName, businessName);
      }

      setShowForm(false);
      setLines([]);
      setForm({
        destinationType: 'job_site', destinationName: '', destinationAddress: '',
        fromWarehouseZone: '', carrier: '', trackingNumber: '', shipDate: '', notes: '',
      });
      router.refresh();
    } catch {
      alert('Failed to create shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredShipments = initialShipments.filter(
    (s) =>
      (s.shipmentNumber ?? '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (s.destinationName ?? '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (s.carrier ?? '').toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-violet-600" />
            Outbound Shipping
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ship materials to job sites, subcontractors, or other locations</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" /> New Shipment
        </Button>
      </div>

      {/* Create Shipment Form */}
      {showForm && (
        <div className="rounded-2xl border-2 border-violet-200 bg-white shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" /> New Shipment
            </h2>
          </div>
          <div className="p-6 space-y-6">

            {/* Destination */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">Destination</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Type</label>
                  <select
                    value={form.destinationType}
                    onChange={(e) => setForm((f) => ({ ...f, destinationType: e.target.value }))}
                    className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="job_site">Job Site</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="customer">Customer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Name / Recipient *</label>
                  <Input
                    value={form.destinationName}
                    onChange={(e) => setForm((f) => ({ ...f, destinationName: e.target.value }))}
                    placeholder="e.g. Sunset Blvd Job Site"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Address</label>
                  <Input
                    value={form.destinationAddress}
                    onChange={(e) => setForm((f) => ({ ...f, destinationAddress: e.target.value }))}
                    placeholder="123 Main St, City, State"
                  />
                </div>
              </div>
            </div>

            {/* Carrier */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Carrier</label>
                <Input
                  value={form.carrier}
                  onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                  placeholder="e.g. Own truck, FedEx, UPS"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tracking Number</label>
                <Input
                  value={form.trackingNumber}
                  onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ship Date</label>
                <Input
                  type="date"
                  value={form.shipDate}
                  onChange={(e) => setForm((f) => ({ ...f, shipDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Items to Ship</h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search inventory to add..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {itemSearch && (
                <div className="max-h-40 overflow-y-auto border-2 border-slate-100 rounded-lg divide-y divide-slate-50 mb-3">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addLine(item)}
                      disabled={!!lines.find((l) => l.itemId === item.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-violet-50 disabled:opacity-40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-slate-900">{item.name}</span>
                          {item.sku && <span className="text-xs text-slate-400 ml-2">SKU: {item.sku}</span>}
                        </div>
                        <span className="text-xs text-slate-500">{item.quantity} {item.unit} available</span>
                      </div>
                      {locStr(item) && <p className="text-xs text-cyan-600 mt-0.5">{locStr(item)}</p>}
                    </button>
                  ))}
                </div>
              )}

              {lines.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-slate-400 text-sm">
                  Search above to add items to this shipment
                </div>
              )}

              {lines.length > 0 && (
                <div className="space-y-2">
                  {lines.map((line) => {
                    const invItem = items.find((i) => i.id === line.itemId);
                    return (
                      <div key={line.itemId} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">{line.itemName}</p>
                            {line.sku && <p className="text-xs text-slate-400">SKU: {line.sku}</p>}
                          </div>
                          <button onClick={() => removeLine(line.itemId)} className="text-slate-400 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                          <div className="sm:col-span-1">
                            <label className="block text-xs text-slate-400 mb-1">Qty *</label>
                            <Input
                              type="number"
                              min="1"
                              max={invItem?.quantity}
                              value={line.quantity}
                              onChange={(e) => updateLine(line.itemId, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">From Zone</label>
                            <Input
                              value={line.fromZone}
                              onChange={(e) => updateLine(line.itemId, 'fromZone', e.target.value)}
                              placeholder="A"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Aisle</label>
                            <Input
                              value={line.fromAisle}
                              onChange={(e) => updateLine(line.itemId, 'fromAisle', e.target.value)}
                              placeholder="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Shelf</label>
                            <Input
                              value={line.fromShelf}
                              onChange={(e) => updateLine(line.itemId, 'fromShelf', e.target.value)}
                              placeholder="B"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Bin</label>
                            <Input
                              value={line.fromBin}
                              onChange={(e) => updateLine(line.itemId, 'fromBin', e.target.value)}
                              placeholder="3"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-right text-sm text-slate-500 font-medium">
                    {lines.length} item type{lines.length !== 1 ? 's' : ''} — {lines.reduce((s, l) => s + l.quantity, 0)} units total
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
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                placeholder="Special instructions, delivery notes..."
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitting || lines.length === 0 || !form.destinationName}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold"
              >
                {submitting ? 'Creating...' : '✓ Create Shipment'}
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={submitting || lines.length === 0 || !form.destinationName}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold"
              >
                <Printer className="h-4 w-4 mr-2" />
                Create + Print Labels
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment History */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-400" /> Shipments
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search shipments..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredShipments.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No shipments yet</p>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {filteredShipments.map((s) => (
            <div key={s.id} className="px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-slate-900">{s.shipmentNumber}</span>
                    <Badge className={STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-700'}>
                      {s.status.replace('_', ' ')}
                    </Badge>
                    {s.destinationType && (
                      <Badge className="bg-slate-100 text-slate-600 capitalize">
                        {s.destinationType.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  {s.destinationName && (
                    <p className="text-sm text-slate-700 font-medium flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-violet-500" />
                      {s.destinationName}
                    </p>
                  )}
                  {s.destinationAddress && <p className="text-xs text-slate-400">{s.destinationAddress}</p>}
                  {s.carrier && <p className="text-xs text-slate-400">Carrier: {s.carrier}{s.trackingNumber ? ` — ${s.trackingNumber}` : ''}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm text-slate-500">
                    <p>{s.lineCount} item type{s.lineCount !== 1 ? 's' : ''}</p>
                    <p>{s.itemCount} units</p>
                    <p className="text-xs">{new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedShipment(expandedShipment === s.id ? null : s.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {expandedShipment === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => printShippingLabels(s, s.items.map((i) => ({
                        itemId: i.id,
                        itemName: i.itemName,
                        unit: i.unit,
                        sku: i.sku,
                        quantity: i.quantityShipped,
                        fromZone: i.fromZone ?? '',
                        fromAisle: i.fromAisle ?? '',
                        fromShelf: i.fromShelf ?? '',
                        fromBin: i.fromBin ?? '',
                      })), s.destinationName ?? '', businessName)}
                      className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                      title="Reprint shipping labels"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {expandedShipment === s.id && (
                <div className="mt-4 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {s.items.map((line) => (
                    <div key={line.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{line.itemName}</p>
                        {line.sku && <p className="text-xs text-slate-400">SKU: {line.sku}</p>}
                        {locStr({ warehouseZone: line.fromZone, warehouseAisle: line.fromAisle, warehouseShelf: line.fromShelf, warehouseBin: line.fromBin }) && (
                          <p className="text-xs text-cyan-600">
                            From: {locStr({ warehouseZone: line.fromZone, warehouseAisle: line.fromAisle, warehouseShelf: line.fromShelf, warehouseBin: line.fromBin })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{line.quantityShipped} {line.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function printShippingLabels(
  shipment: { shipmentNumber: string; destinationName?: string | null; destinationAddress?: string | null; carrier?: string | null },
  lines: Array<{ itemName: string; sku: string | null; unit: string; quantity: number; fromZone: string; fromAisle: string; fromShelf: string; fromBin: string }>,
  destinationName: string,
  businessName: string
) {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const linesHtml = lines.map((l) => {
    const from = [l.fromZone && `Zone ${l.fromZone}`, l.fromAisle && `Aisle ${l.fromAisle}`, l.fromShelf && `Shelf ${l.fromShelf}`, l.fromBin && `Bin ${l.fromBin}`].filter(Boolean).join(' / ');
    return `<div class="line"><span class="item">${l.itemName}${l.sku ? ` <small>(${l.sku})</small>` : ''}</span> — <strong>${l.quantity} ${l.unit}</strong>${from ? ` <span class="from">from ${from}</span>` : ''}</div>`;
  }).join('');

  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Shipping Label — ${shipment.shipmentNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; }
    .label { width: 100%; max-width: 6in; border: 3px solid #000; border-radius: 10px; padding: 20px; margin: 0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:12px; margin-bottom:12px; }
    .company { font-size:11px; font-weight:bold; color:#666; text-transform:uppercase; letter-spacing:.1em; }
    .ship-num { font-size:30px; font-weight:900; font-family:'Courier New',monospace; border:2px solid #000; padding:4px 12px; border-radius:4px; letter-spacing:.1em; }
    .to-section { margin:12px 0; }
    .to-label { font-size:10px; font-weight:bold; color:#666; text-transform:uppercase; letter-spacing:.1em; }
    .to-name { font-size:22px; font-weight:900; }
    .to-addr { font-size:13px; color:#444; margin-top:2px; }
    .items-section { margin-top:14px; border-top:1px dashed #999; padding-top:10px; }
    .items-label { font-size:10px; font-weight:bold; color:#666; text-transform:uppercase; letter-spacing:.1em; margin-bottom:6px; }
    .line { font-size:12px; padding:3px 0; border-bottom:1px solid #eee; }
    .item { font-weight:bold; }
    .from { color:#1d6fa5; font-size:11px; }
    .footer { margin-top:12px; display:flex; justify-content:space-between; font-size:10px; color:#888; }
    @media print { body{padding:0;} @page{size:6in auto;margin:0.25in;} }
  </style></head><body>
  <div class="label">
    <div class="header">
      <div><div class="company">${businessName}</div><div style="font-size:12px;color:#555;margin-top:4px;">Outbound Shipment</div></div>
      <div class="ship-num">${shipment.shipmentNumber}</div>
    </div>
    <div class="to-section">
      <div class="to-label">Ship To</div>
      <div class="to-name">${destinationName}</div>
      ${shipment.destinationAddress ? `<div class="to-addr">${shipment.destinationAddress}</div>` : ''}
    </div>
    ${shipment.carrier ? `<div style="font-size:12px;color:#555;margin-top:6px;">Carrier: <strong>${shipment.carrier}</strong></div>` : ''}
    <div class="items-section">
      <div class="items-label">Contents (${lines.length} item type${lines.length !== 1 ? 's' : ''} — ${lines.reduce((s, l) => s + l.quantity, 0)} units)</div>
      ${linesHtml}
    </div>
    <div class="footer"><span>${date}</span><span>${businessName}</span></div>
  </div>
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  win.document.close();
}
