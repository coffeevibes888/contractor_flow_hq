'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Wrench, Zap, Droplets, PaintBucket, Trees, Hammer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const categories = [
  { id: 'plumbing', label: 'Plumbing', icon: Droplets },
  { id: 'electrical', label: 'Electrical', icon: Zap },
  { id: 'hvac', label: 'HVAC', icon: Wrench },
  { id: 'painting', label: 'Painting', icon: PaintBucket },
  { id: 'landscaping', label: 'Landscaping', icon: Trees },
  { id: 'general', label: 'General Repairs', icon: Hammer },
];

const priorities = [
  { id: 'low', label: 'Low', desc: 'Can wait a few weeks' },
  { id: 'medium', label: 'Medium', desc: 'Within the next week' },
  { id: 'high', label: 'High', desc: 'Within a few days' },
  { id: 'urgent', label: 'Urgent', desc: 'ASAP' },
];

export default function NewJobPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    budgetMin: '',
    budgetMax: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title || !form.description || !form.category) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/homeowner/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
          budgetMin: form.budgetMin ? parseFloat(form.budgetMin) : null,
          budgetMax: form.budgetMax ? parseFloat(form.budgetMax) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      toast({
        title: 'Job Posted!',
        description: 'Contractors can now submit bids on your job',
      });

      router.push('/homeowner/jobs');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link 
            href="/homeowner/jobs" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Post a New Job</h1>
          <p className="text-slate-600 mt-1">Describe your project and get bids from contractors</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Fix leaky faucet in kitchen"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the work needed in detail..."
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = form.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                        }`}
                        onClick={() => setForm({ ...form, category: cat.id })}
                      >
                        <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                        <p className="font-medium text-sm">{cat.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle>Priority & Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="grid grid-cols-2 gap-3">
                  {priorities.map((p) => {
                    const isSelected = form.priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50'
                            : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                        }`}
                        onClick={() => setForm({ ...form, priority: p.id })}
                      >
                        <p className={`font-medium ${isSelected ? 'text-sky-700' : 'text-slate-900'}`}>
                          {p.label}
                        </p>
                        <p className="text-xs text-slate-500">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetMin">Budget Min ($)</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.budgetMin}
                    onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetMax">Budget Max ($)</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.budgetMax}
                    onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Leave blank if you're flexible on budget
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Link href="/homeowner/jobs" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Job
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
