'use client';

import { useState, useMemo } from 'react';
import { Search, MapPin, Package, AlertTriangle, Layers, Hash, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BarcodeScanner from '@/components/shared/barcode-scanner';

interface ItemLocation {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  warehouseQuantity: number;
  unit: string;
  warehouseZone: string | null;
  warehouseAisle: string | null;
  warehouseShelf: string | null;
  warehouseBin: string | null;
  lastReceivedDate: string | null;
  reorderPoint: number | null;
}

interface LabelLookup {
  id: string;
  labelNumber: string;
  itemName: string | null;
  sku: string | null;
  quantity: number | null;
  unit: string | null;
  warehouseZone: string | null;
  warehouseAisle: string | null;
  warehouseShelf: string | null;
  warehouseBin: string | null;
  labelType: string;
  printedAt: string;
}

interface Props {
  items: ItemLocation[];
  labels: LabelLookup[];
}

const locStr = (r: { warehouseZone?: string | null; warehouseAisle?: string | null; warehouseShelf?: string | null; warehouseBin?: string | null }) => {
  const parts = [
    r.warehouseZone ? `Zone ${r.warehouseZone}` : null,
    r.warehouseAisle ? `Aisle ${r.warehouseAisle}` : null,
    r.warehouseShelf ? `Shelf ${r.warehouseShelf}` : null,
    r.warehouseBin ? `Bin ${r.warehouseBin}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : null;
};

export function LocateClient({ items, labels }: Props) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'item' | 'label' | 'zone'>('item');
  const [selectedZone, setSelectedZone] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const zones = useMemo(() => {
    const z = new Set<string>();
    items.forEach((i) => { if (i.warehouseZone) z.add(i.warehouseZone); });
    return Array.from(z).sort();
  }, [items]);

  const itemResults = useMemo(() => {
    if (!query && mode === 'item') return items.filter((i) => i.warehouseZone || i.warehouseAisle);
    if (!query) return [];
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku ?? '').toLowerCase().includes(q) ||
        (i.category ?? '').toLowerCase().includes(q) ||
        (i.warehouseZone ?? '').toLowerCase().includes(q) ||
        (i.warehouseAisle ?? '').toLowerCase().includes(q) ||
        (i.warehouseBin ?? '').toLowerCase().includes(q)
    );
  }, [query, items, mode]);

  const labelResults = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return labels.filter(
      (l) =>
        l.labelNumber.toLowerCase().includes(q) ||
        (l.itemName ?? '').toLowerCase().includes(q) ||
        (l.sku ?? '').toLowerCase().includes(q)
    );
  }, [query, labels]);

  const zoneItems = useMemo(() => {
    if (!selectedZone) return [];
    return items.filter((i) => i.warehouseZone === selectedZone);
  }, [selectedZone, items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-emerald-600" />
            Find Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Look up any item or scan a label number to find exactly where it&apos;s stored
          </p>
        </div>
        <Button
          onClick={() => setScannerOpen(true)}
          className='bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm'
        >
          <ScanLine className='h-4 w-4 mr-1.5' />
          Scan Code
        </Button>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => {
          // Switch to label mode if it looks like a label number, otherwise item search
          const looksLikeLabel = /^[A-Z0-9-]+$/i.test(value) && /\d/.test(value);
          setMode(looksLikeLabel ? 'label' : 'item');
          setQuery(value);
          setScannerOpen(false);
        }}
        title='Scan to find inventory'
        description='Point at a label, item barcode, or QR code. We&apos;ll search by what you scan.'
      />

      {/* Mode Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { key: 'item', label: '📦 By Item', icon: Package },
          { key: 'label', label: '🏷 By Label #', icon: Hash },
          { key: 'zone', label: '🗺 Browse by Zone', icon: Layers },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setQuery(''); setSelectedZone(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mode === key ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {mode !== 'zone' && (
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            className="pl-12 py-3 text-base rounded-xl border-2 border-slate-200 focus:border-emerald-500"
            placeholder={
              mode === 'item'
                ? 'Search by item name, SKU, or category...'
                : 'Enter label number or scan barcode...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* ITEM RESULTS */}
      {mode === 'item' && (
        <div className="space-y-3">
          {itemResults.length === 0 && query && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No items found for &quot;{query}&quot;</p>
            </div>
          )}
          {itemResults.length === 0 && !query && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No items with location data</p>
              <p className="text-sm mt-1">Assign items to warehouse locations when receiving them</p>
            </div>
          )}
          {itemResults.map((item) => {
            const loc = locStr(item);
            const isLow = item.reorderPoint != null && item.quantity <= item.reorderPoint;
            const isOut = item.quantity === 0;
            return (
              <div
                key={item.id}
                className={`rounded-xl border-2 bg-white p-5 shadow-sm transition-all ${
                  isOut ? 'border-red-200' : isLow ? 'border-amber-200' : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-lg">{item.name}</span>
                      {item.sku && <span className="text-xs text-slate-400 font-mono">SKU: {item.sku}</span>}
                      {item.category && (
                        <Badge className="bg-slate-100 text-slate-600 text-xs">{item.category}</Badge>
                      )}
                      {isOut && <Badge className="bg-red-100 text-red-700">Out of Stock</Badge>}
                      {isLow && !isOut && <Badge className="bg-amber-100 text-amber-700">Low Stock</Badge>}
                    </div>

                    {loc ? (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="font-bold text-base">{loc}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">No location assigned</span>
                      </div>
                    )}

                    {/* Visual location breakdown */}
                    {(item.warehouseZone || item.warehouseAisle || item.warehouseShelf || item.warehouseBin) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.warehouseZone && (
                          <div className="flex flex-col items-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-center">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Zone</span>
                            <span className="font-black text-emerald-800 text-lg leading-none">{item.warehouseZone}</span>
                          </div>
                        )}
                        {item.warehouseAisle && (
                          <div className="flex flex-col items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-center">
                            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Aisle</span>
                            <span className="font-black text-blue-800 text-lg leading-none">{item.warehouseAisle}</span>
                          </div>
                        )}
                        {item.warehouseShelf && (
                          <div className="flex flex-col items-center bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5 text-center">
                            <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">Shelf</span>
                            <span className="font-black text-violet-800 text-lg leading-none">{item.warehouseShelf}</span>
                          </div>
                        )}
                        {item.warehouseBin && (
                          <div className="flex flex-col items-center bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 text-center">
                            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Bin</span>
                            <span className="font-black text-orange-800 text-lg leading-none">{item.warehouseBin}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-3xl font-black text-slate-900">{item.quantity}</p>
                    <p className="text-sm text-slate-500">{item.unit} on hand</p>
                    {item.warehouseQuantity !== item.quantity && (
                      <p className="text-xs text-slate-400 mt-0.5">{item.warehouseQuantity} in warehouse</p>
                    )}
                    {item.lastReceivedDate && (
                      <p className="text-xs text-slate-400 mt-1">
                        Last received {new Date(item.lastReceivedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LABEL RESULTS */}
      {mode === 'label' && (
        <div className="space-y-3">
          {query && labelResults.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No label found for &quot;{query}&quot;</p>
            </div>
          )}
          {!query && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium">Enter a label number above</p>
              <p className="text-sm mt-1">Type or scan any label to see where that inventory is stored</p>
            </div>
          )}
          {labelResults.map((l) => {
            const loc = locStr(l);
            return (
              <div key={l.id} className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-black text-xl text-slate-900 border-2 border-slate-900 px-3 py-0.5 rounded">
                        {l.labelNumber}
                      </span>
                      <Badge className="bg-cyan-100 text-cyan-700 capitalize">{l.labelType}</Badge>
                    </div>
                    {l.itemName && <p className="font-bold text-slate-900 text-lg">{l.itemName}</p>}
                    {l.sku && <p className="text-xs text-slate-500">SKU: {l.sku}</p>}
                    {loc ? (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <MapPin className="h-5 w-5" />
                        <span className="font-black text-xl">{loc}</span>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No location on this label</p>
                    )}
                    {/* Visual blocks */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {l.warehouseZone && (
                        <div className="flex flex-col items-center bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-1.5">
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Zone</span>
                          <span className="font-black text-emerald-900 text-xl">{l.warehouseZone}</span>
                        </div>
                      )}
                      {l.warehouseAisle && (
                        <div className="flex flex-col items-center bg-blue-100 border border-blue-300 rounded-lg px-3 py-1.5">
                          <span className="text-[9px] font-bold text-blue-600 uppercase">Aisle</span>
                          <span className="font-black text-blue-900 text-xl">{l.warehouseAisle}</span>
                        </div>
                      )}
                      {l.warehouseShelf && (
                        <div className="flex flex-col items-center bg-violet-100 border border-violet-300 rounded-lg px-3 py-1.5">
                          <span className="text-[9px] font-bold text-violet-600 uppercase">Shelf</span>
                          <span className="font-black text-violet-900 text-xl">{l.warehouseShelf}</span>
                        </div>
                      )}
                      {l.warehouseBin && (
                        <div className="flex flex-col items-center bg-orange-100 border border-orange-300 rounded-lg px-3 py-1.5">
                          <span className="text-[9px] font-bold text-orange-600 uppercase">Bin</span>
                          <span className="font-black text-orange-900 text-xl">{l.warehouseBin}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {l.quantity != null && (
                      <p className="text-3xl font-black text-slate-900">{l.quantity}</p>
                    )}
                    {l.unit && <p className="text-sm text-slate-500">{l.unit}</p>}
                    <p className="text-xs text-slate-400 mt-2">
                      Printed {new Date(l.printedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ZONE BROWSER */}
      {mode === 'zone' && (
        <div className="space-y-4">
          {zones.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No zones configured yet. Assign zones when receiving items.</p>
            </div>
          )}
          {/* Zone picker */}
          {zones.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {zones.map((z) => (
                <button
                  key={z}
                  onClick={() => setSelectedZone(selectedZone === z ? '' : z)}
                  className={`px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors ${
                    selectedZone === z
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400'
                  }`}
                >
                  Zone {z}
                  <span className="ml-2 text-xs font-normal opacity-70">
                    ({items.filter((i) => i.warehouseZone === z).length} items)
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedZone && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                Zone {selectedZone} — {zoneItems.length} item{zoneItems.length !== 1 ? 's' : ''}
              </h3>
              {zoneItems.map((item) => (
                <div key={item.id} className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                    <p className="text-sm text-emerald-700 font-medium mt-1">{locStr(item) ?? 'Zone only'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900">{item.quantity}</p>
                    <p className="text-xs text-slate-500">{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
