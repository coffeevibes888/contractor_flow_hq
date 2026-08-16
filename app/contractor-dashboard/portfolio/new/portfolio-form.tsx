'use client';

/**
 * New portfolio item form. Submits multipart form data (project fields +
 * images) to POST /api/contractor/portfolio, which uploads the images to
 * Cloudinary and creates the ContractorPortfolioItem row.
 */

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ImagePlus, Loader2, X, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  'Kitchen',
  'Bathroom',
  'Roofing',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Painting',
  'Flooring',
  'Landscaping',
  'Carpentry',
  'General',
  'Other',
];

export default function PortfolioForm() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Kitchen');
  const [location, setLocation] = useState('');
  const [projectDate, setProjectDate] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [featured, setFeatured] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, 12)); // cap at 12 images
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ title: 'Add a title and description', variant: 'destructive' });
      return;
    }
    if (files.length === 0) {
      toast({ title: 'Add at least one photo', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append(
        'data',
        JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim() || null,
          projectDate: projectDate || null,
          budget: budget || null,
          duration: duration || null,
          featured,
          isPublic: true,
        }),
      );
      files.forEach((file, i) => formData.append(`image${i}`, file));

      const res = await fetch('/api/contractor/portfolio', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({ title: 'Work added to your portfolio' });
        router.push('/contractor-dashboard/portfolio');
        router.refresh();
      } else {
        const err = await res.json().catch(() => null);
        toast({
          title: 'Could not save',
          description: err?.error || 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Portfolio create error:', err);
      toast({ title: 'Network error', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/contractor-dashboard/portfolio"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Work</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Showcase a completed project with photos and details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photos */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <Label className="text-sm font-semibold text-gray-800">Photos *</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesPicked}
            className="hidden"
          />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {previews.map((p, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50 grid place-items-center text-gray-400 hover:text-amber-500 transition"
            >
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="h-6 w-6" />
                <span className="text-[11px] font-medium">Add</span>
              </div>
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm text-gray-700">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Full kitchen remodel in Henderson"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm text-gray-700">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work, materials, and outcome…"
              rows={4}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-700">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-sm text-gray-700">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="projectDate" className="text-sm text-gray-700">Completed</Label>
              <Input id="projectDate" type="date" value={projectDate} onChange={(e) => setProjectDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget" className="text-sm text-gray-700">Budget ($)</Label>
              <Input id="budget" type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-sm text-gray-700">Duration (days)</Label>
              <Input id="duration" type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="0" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFeatured((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              featured
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Star className={`h-4 w-4 ${featured ? 'fill-amber-400 text-amber-400' : ''}`} />
            {featured ? 'Featured on your profile' : 'Feature on your profile'}
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Work'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
