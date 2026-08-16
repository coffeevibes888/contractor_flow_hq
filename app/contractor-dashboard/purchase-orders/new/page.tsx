'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Vendor {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  jobNumber: string;
}

interface LineItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    fetchVendorsAndJobs();
  }, []);

  const fetchVendorsAndJobs = async () => {
    try {
      const [vendorsRes, jobsRes] = await Promise.all([
        fetch('/api/contractor/vendors'),
        fetch('/api/contractor/jobs'),
      ]);

      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        setVendors(data.vendors || []);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      sku: '',
      quantity: 1,
      unit: 'each',
      unitPrice: 0,
      notes: ''
    }]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * 0.08; // 8% tax default
    const shipping = 0;
    return { subtotal, tax, shipping, total: subtotal + tax + shipping };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      toast({ title: 'Error', description: 'Add at least one line item', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const totals = calculateTotals();

    const data = {
      vendorId: formData.get('vendorId'),
      jobId: formData.get('jobId') || null,
      requiredDate: formData.get('requiredDate'),
      deliveryAddress: formData.get('deliveryAddress'),
      deliveryCity: formData.get('deliveryCity'),
      deliveryState: formData.get('deliveryState'),
      deliveryZip: formData.get('deliveryZip'),
      deliveryInstructions: formData.get('deliveryInstructions'),
      notes: formData.get('notes'),
      lineItems: lineItems.map(item => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        notes: item.notes
      })),
      ...totals
    };

    try {
      const res = await fetch('/api/contractor/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        toast({ title: 'Purchase order created', description: `PO Number: ${result.poNumber}` });
        router.push('/contractor-dashboard/purchase-orders');
      } else {
        throw new Error('Failed to create PO');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create purchase order', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/contractor-dashboard/purchase-orders">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create Purchase Order</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendorId">Select Vendor *</Label>
                <select
                  id="vendorId"
                  name="vendorId"
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Choose a vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobId">Link to Job (Optional)</Label>
                <select
                  id="jobId"
                  name="jobId"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">General inventory...</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.jobNumber} - {job.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredDate">Required Delivery Date</Label>
                <Input id="requiredDate" name="requiredDate" type="date" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input name="deliveryAddress" placeholder="Street Address" />
              <div className="grid grid-cols-3 gap-2">
                <Input name="deliveryCity" placeholder="City" />
                <Input name="deliveryState" placeholder="State" />
                <Input name="deliveryZip" placeholder="ZIP" />
              </div>
              <textarea
                name="deliveryInstructions"
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background"
                placeholder="Delivery instructions..."
              />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" onClick={addLineItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No items added yet</p>
                <Button type="button" onClick={addLineItem} variant="outline" className="mt-2">
                  Add First Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-4 border rounded-lg">
                    <div className="col-span-4">
                      <Input
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="SKU"
                        value={item.sku}
                        onChange={(e) => updateLineItem(item.id, 'sku', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1 text-right pt-2">
                      <span className="font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                name="notes"
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
                placeholder="Notes for vendor (visible on PO)..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8%):</span>
                <span className="font-medium">${totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-medium">${totals.shipping.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Purchase Order
          </Button>
          <Link href="/contractor-dashboard/purchase-orders">
            <Button variant="outline" disabled={loading}>Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
