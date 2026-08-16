'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Job {
  id: string;
  title: string;
  jobNumber: string;
}

const warrantyTypes = [
  { value: 'workmanship', label: 'Workmanship' },
  { value: 'material', label: 'Material' },
  { value: 'extended', label: 'Extended Service' },
  { value: 'manufacturer', label: 'Manufacturer' },
];

export default function NewWarrantyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [durationMonths, setDurationMonths] = useState(12);

  useEffect(() => {
    fetchCustomersAndJobs();
  }, []);

  const fetchCustomersAndJobs = async () => {
    try {
      const [customersRes, jobsRes] = await Promise.all([
        fetch('/api/contractor/customers'),
        fetch('/api/contractor/jobs'),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      warrantyType: formData.get('warrantyType'),
      customerId: formData.get('customerId'),
      jobId: formData.get('jobId') || null,
      description: formData.get('description'),
      coverage: formData.get('coverage'),
      exclusions: formData.get('exclusions'),
      startDate: formData.get('startDate'),
      durationMonths: parseInt(durationMonths.toString()),
      notes: formData.get('notes'),
    };

    try {
      const res = await fetch('/api/contractor/warranties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        toast({ title: 'Warranty created', description: `Warranty Number: ${result.warrantyNumber}` });
        router.push('/contractor-dashboard/warranties');
      } else {
        throw new Error('Failed to create warranty');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create warranty', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/contractor-dashboard/warranties">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create Warranty</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Warranty Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Warranty Title *</Label>
              <Input id="title" name="title" placeholder="e.g., Roof Installation - 10 Year Workmanship" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warrantyType">Warranty Type *</Label>
                <select
                  id="warrantyType"
                  name="warrantyType"
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {warrantyTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMonths">Duration (Months) *</Label>
                <Input
                  id="durationMonths"
                  name="durationMonths"
                  type="number"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(parseInt(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId">Customer *</Label>
              <select
                id="customerId"
                name="customerId"
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Select customer...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobId">Linked Job (Optional)</Label>
              <select
                id="jobId"
                name="jobId"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Standalone warranty...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.jobNumber} - {job.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Coverage Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background"
                placeholder="Brief description of what this warranty covers..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverage">What&apos;s Covered</Label>
              <textarea
                id="coverage"
                name="coverage"
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
                placeholder="List all items, repairs, and services covered by this warranty..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exclusions">What&apos;s Not Covered (Exclusions)</Label>
              <textarea
                id="exclusions"
                name="exclusions"
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
                placeholder="List exclusions, limitations, and conditions that void the warranty..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="notes"
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
              placeholder="Internal notes (not visible to customer)..."
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Warranty
          </Button>
          <Link href="/contractor-dashboard/warranties">
            <Button variant="outline" disabled={loading}>Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
