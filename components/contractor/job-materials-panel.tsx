'use client';

/**
 * JobMaterialsPanel
 *
 * Shows materials linked to a job, their inventory status (in stock / short),
 * and lets the contractor add items from their inventory.
 * Renders inside the Job Details tabs.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Package, Plus, Trash2, AlertTriangle, CheckCircle,
  RefreshCw, ShoppingCart, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface MaterialRow {
  materialId: string;
  itemId: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  quantityNeeded: number;
  quantityInStock: number;
  quantityReserved: number;
  quantityLoaded: number;
  shortage: number;
  status: string;
  isReady: boolean;
  vendor: { id: string; name: string } | null;
}

interface InventoryOption {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit: string;
  category: string;
}

interface Props {
  jobId: string;
  contractorId: string;
  canEdit?: boolean;
}

export function JobMaterialsPanel({ jobId, contractorId, canEdit = true }: Props) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [inventory, setInventory] = useState<InventoryOption[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [adding, setAdding] = useState(false);

  const fetchCheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/inventory-check`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials ?? []);
      }
    } finally {
      setChecking(false);
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchCheck(); }, [fetchCheck]);

  const loadInventory = async () => {
    if (inventory.length > 0) return;
    const res = await fetch('/api/contractor/inventory');
    if (res.ok) {
      const data = await res.json();
      setInventory(data.items ?? []);
    }
  };

  const handleAdd = async () => {
    if (!selectedItemId || !qty) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/contractor/jobs/${jobId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItemId, quantityNeeded: Number(qty) }),
      });
      if (res.ok) {
        toast.success('Material added');
        setShowAdd(false);
        setSelectedItemId('');
        setQty('1');
        fetchCheck();
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Failed to add material');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (materialId: string) => {
    const res = await fetch(`/api/contractor/jobs/${jobId}/materials?materialId=${materialId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Removed');
      fetchCheck();
    }
  };

  const shortages = materials.filter((m) => !m.isReady);
  const allReady = materials.length > 0 && shortages.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-800">Materials & Inventory</h3>
          {materials.length > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              allReady ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {allReady ? '✓ All Ready' : `${shortages.length} shortage${shortages.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchCheck} disabled={checking}
            className="border-gray-200 text-xs h-7">
            <RefreshCw className={`h-3 w-3 mr-1 ${checking ? 'animate-spin' : ''}`} />
            Check Stock
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => { setShowAdd(true); loadInventory(); }}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Add Material
            </Button>
          )}
        </div>
      </div>

      {/* Add material form */}
      {showAdd && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-800">Add material from inventory</p>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800"
            >
              <option value="">Select inventory item...</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity} {item.unit} in stock)
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty needed"
              className="w-28 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-800"
            />
            <Button size="sm" onClick={handleAdd} disabled={adding || !selectedItemId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              {adding ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}
              className="border-gray-200 text-xs">
              Cancel
            </Button>
          </div>
          {inventory.length === 0 && (
            <p className="text-xs text-gray-500">
              No inventory items found.{' '}
              <Link href="/contractor-dashboard/inventory/new" className="text-amber-600 underline">
                Add items to inventory first.
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Materials list */}
      {materials.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No materials linked to this job yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add materials to automatically check warehouse stock before the job starts.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-50">
            {materials.map((mat) => (
              <div key={mat.materialId} className="flex items-center gap-3 px-4 py-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  mat.isReady ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {mat.isReady
                    ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                    : <AlertTriangle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{mat.name}</p>
                  <p className="text-[10px] text-gray-500 capitalize">
                    {mat.category}{mat.sku ? ` · SKU: ${mat.sku}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs font-semibold text-gray-800">
                    Need: {mat.quantityNeeded} {mat.unit}
                  </p>
                  <p className={`text-[10px] font-medium ${
                    mat.isReady ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {mat.isReady
                      ? `✓ ${mat.quantityInStock} in stock`
                      : `⚠ ${mat.quantityInStock} in stock · short ${mat.shortage}`}
                  </p>
                </div>
                {!mat.isReady && mat.vendor && (
                  <Link href={`/contractor-dashboard/vendors/${mat.vendor.id}`}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700">
                    <ShoppingCart className="h-3 w-3" /> Reorder
                  </Link>
                )}
                {canEdit && (
                  <button onClick={() => handleRemove(mat.materialId)}
                    className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shortage action */}
      {shortages.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 flex-1">
            <span className="font-bold">{shortages.length} item{shortages.length !== 1 ? 's' : ''} need restocking</span>
            {' '}before this job can start.
          </p>
          <Link href="/contractor-dashboard/inventory">
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white text-xs h-7">
              <ExternalLink className="h-3 w-3 mr-1" /> View Inventory
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
