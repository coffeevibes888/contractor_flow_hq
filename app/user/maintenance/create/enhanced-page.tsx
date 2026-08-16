'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useUploadThing } from '@/lib/uploadthing';
import {
  Loader2,
  Upload,
  X,
  AlertCircle,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';

// Room/Location options
const LOCATION_OPTIONS = [
  { value: 'kitchen', label: '🍳 Kitchen' },
  { value: 'bathroom', label: '🚿 Bathroom' },
  { value: 'bedroom', label: '🛏️ Bedroom' },
  { value: 'living_room', label: '🛋️ Living Room' },
  { value: 'dining_room', label: '🍽️ Dining Room' },
  { value: 'laundry', label: '🧺 Laundry Room' },
  { value: 'garage', label: '🚗 Garage' },
  { value: 'basement', label: '🏠 Basement' },
  { value: 'attic', label: '🏚️ Attic' },
  { value: 'exterior', label: '🏡 Exterior' },
  { value: 'common_area', label: '👥 Common Area' },
  { value: 'other', label: '📍 Other' },
];

// Priority levels with descriptions
const PRIORITY_LEVELS = [
  {
    value: 'low',
    label: 'Low Priority',
    icon: CheckCircle2,
    color: 'border-green-200 hover:border-green-400 hover:bg-green-50',
    selectedColor: 'border-green-500 bg-green-50',
    badgeColor: 'bg-green-100 text-green-700',
    description: 'Can wait a few days',
    examples: 'Squeaky door, small scratch, light bulb',
  },
  {
    value: 'medium',
    label: 'Medium Priority',
    icon: Clock,
    color: 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50',
    selectedColor: 'border-yellow-500 bg-yellow-50',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    description: 'Needs attention this week',
    examples: 'Dripping faucet, loose handle, minor leak',
  },
  {
    value: 'high',
    label: 'High Priority',
    icon: AlertTriangle,
    color: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50',
    selectedColor: 'border-orange-500 bg-orange-50',
    badgeColor: 'bg-orange-100 text-orange-700',
    description: 'Needs attention within 24-48 hours',
    examples: 'No hot water, broken appliance, significant leak',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    icon: Zap,
    color: 'border-red-200 hover:border-red-400 hover:bg-red-50',
    selectedColor: 'border-red-500 bg-red-50',
    badgeColor: 'bg-red-100 text-red-700',
    description: 'Safety hazard - Immediate attention required',
    examples: 'No heat in winter, gas leak, electrical hazard, flooding',
  },
];

// Access schedule options
const ACCESS_SCHEDULE_OPTIONS = [
  { value: 'weekday_morning', label: 'Weekday Mornings (8am-12pm)' },
  { value: 'weekday_afternoon', label: 'Weekday Afternoons (12pm-5pm)' },
  { value: 'weekend', label: 'Weekends' },
  { value: 'anytime', label: 'Anytime (I\'ll be home)' },
];

interface UploadedFile {
  type: 'image' | 'video';
  url: string;
  filename: string;
  uploadedAt: string;
}

const ticketSchema = z.object({
  location: z.string().min(1, 'Please select where the issue is located'),
  title: z.string().min(3, 'Please describe the issue briefly'),
  description: z.string().min(10, 'Please provide more details about the problem'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  accessSchedule: z.array(z.string()).min(1, 'Please select at least one time slot'),
  accessNotes: z.string().optional(),
});

export default function EnhancedMaintenanceTicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const { startUpload: startImageUpload } = useUploadThing('maintenanceMedia', {
    onUploadError: () => {
      toast({ title: 'Upload failed', description: 'Could not upload file. Please try again.', variant: 'destructive' });
      setUploading(false);
    },
  });

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      location: '',
      title: '',
      description: '',
      priority: 'medium',
      accessSchedule: [],
      accessNotes: '',
    },
  });

  const selectedPriority = form.watch('priority');
  const selectedPriorityData = PRIORITY_LEVELS.find(p => p.value === selectedPriority);

  const handleFileUpload = async (files: File[]) => {
    const validFiles = files.filter((f) => {
      const ok = f.type.startsWith('image/') || f.type.startsWith('video/');
      if (!ok) {
        toast({ title: 'Invalid file type', description: `${f.name} is not an image or video.`, variant: 'destructive' });
      }
      return ok;
    });
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const results = await startImageUpload(validFiles);
      if (!results) throw new Error('Upload returned no results');

      const newFiles: UploadedFile[] = results.map((r) => ({
        type: (r.type ?? '').startsWith('video/') ? 'video' : 'image',
        url: r.ufsUrl || r.url,
        filename: r.name,
        uploadedAt: new Date().toISOString(),
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast({ title: 'Files uploaded', description: `${newFiles.length} file(s) uploaded successfully` });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload files. Please try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof ticketSchema>) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        attachments: uploadedFiles,
      };

      const res = await fetch('/api/maintenance-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({ 
          title: 'Request submitted successfully!', 
          description: 'Your property manager has been notified and will respond soon.' 
        });
        router.push('/user/dashboard');
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: 'Failed to submit request',
          description: data.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ 
        title: 'Network error', 
        description: 'Could not reach the server. Check your connection.', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className='w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 md:px-8'>
      <div className='max-w-4xl mx-auto space-y-6'>
        {/* Header */}
        <div className='text-center space-y-2'>
          <h1 className='text-3xl md:text-4xl font-bold text-slate-900'>Submit Maintenance Request</h1>
          <p className='text-slate-600 max-w-2xl mx-auto'>
            Tell us what needs attention and we'll get it fixed. Include photos or videos to help us understand the issue better.
          </p>
        </div>

        {/* Emergency Contact Banner */}
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='pt-6'>
            <div className='flex items-start gap-3'>
              <Phone className='h-5 w-5 text-red-600 mt-0.5 flex-shrink-0' />
              <div>
                <h3 className='font-semibold text-red-900 mb-1'>Emergency?</h3>
                <p className='text-sm text-red-700 mb-2'>
                  For urgent issues like gas leaks, flooding, no heat in winter, or electrical hazards, 
                  call our emergency line immediately:
                </p>
                <a 
                  href='tel:1-800-EMERGENCY' 
                  className='inline-flex items-center gap-2 text-red-900 font-bold hover:underline'
                >
                  <Phone className='h-4 w-4' />
                  1-800-EMERGENCY
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <MapPin className='h-5 w-5 text-blue-600' />
                  Where is the issue?
                </CardTitle>
                <CardDescription>Select the room or area where the problem is located</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name='location'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <select
                          {...field}
                          className='w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all'
                        >
                          <option value=''>Select a location...</option>
                          {LOCATION_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <FileText className='h-5 w-5 text-blue-600' />
                  Describe the issue
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Summary</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder='e.g., Bathroom sink leaking under cabinet' 
                          className='bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={5}
                          placeholder='Please describe the problem in detail. When did it start? Is it getting worse? Any other relevant information?'
                          className='bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The more details you provide, the faster we can resolve the issue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Photo/Video Upload */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <ImageIcon className='h-5 w-5 text-blue-600' />
                  Add Photos or Videos (Optional)
                </CardTitle>
                <CardDescription>
                  Visual documentation helps us understand and fix the issue faster
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Upload Zone */}
                <div className='border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors'>
                  <input
                    type='file'
                    accept='image/*,video/*'
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) handleFileUpload(files);
                    }}
                    className='hidden'
                    id='file-upload'
                    disabled={uploading || uploadedFiles.length >= 5}
                  />
                  <label 
                    htmlFor='file-upload' 
                    className='cursor-pointer flex flex-col items-center gap-2'
                  >
                    <Upload className='h-10 w-10 text-slate-400' />
                    <div>
                      <p className='text-sm font-medium text-slate-700'>
                        Click to upload or drag and drop
                      </p>
                      <p className='text-xs text-slate-500 mt-1'>
                        Images (JPG, PNG) or Videos (MP4, MOV) • Max 5 files • 10MB each
                      </p>
                    </div>
                  </label>
                </div>

                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className='relative group'>
                        <div className='aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100'>
                          {file.type === 'image' ? (
                            <img 
                              src={file.url} 
                              alt={file.filename}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <div className='w-full h-full flex items-center justify-center bg-slate-200'>
                              <Video className='h-12 w-12 text-slate-400' />
                            </div>
                          )}
                        </div>
                        <button
                          type='button'
                          onClick={() => removeFile(index)}
                          className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600'
                        >
                          <X className='h-4 w-4' />
                        </button>
                        <p className='text-xs text-slate-600 mt-1 truncate'>{file.filename}</p>
                      </div>
                    ))}
                  </div>
                )}

                {uploading && (
                  <div className='flex items-center justify-center gap-2 text-blue-600'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span className='text-sm'>Uploading...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Priority Selection */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Zap className='h-5 w-5 text-blue-600' />
                  How urgent is this?
                </CardTitle>
                <CardDescription>Help us prioritize your request appropriately</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name='priority'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                          {PRIORITY_LEVELS.map((level) => {
                            const Icon = level.icon;
                            const isSelected = field.value === level.value;
                            return (
                              <button
                                key={level.value}
                                type='button'
                                onClick={() => field.onChange(level.value)}
                                className={`text-left p-4 rounded-lg border-2 transition-all ${
                                  isSelected ? level.selectedColor : level.color
                                }`}
                              >
                                <div className='flex items-start gap-3'>
                                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                    isSelected ? 'text-current' : 'text-slate-400'
                                  }`} />
                                  <div className='flex-1 min-w-0'>
                                    <div className='flex items-center gap-2 mb-1'>
                                      <span className='font-semibold text-slate-900'>{level.label}</span>
                                      {isSelected && (
                                        <Badge className={level.badgeColor}>Selected</Badge>
                                      )}
                                    </div>
                                    <p className='text-sm text-slate-600 mb-2'>{level.description}</p>
                                    <p className='text-xs text-slate-500'>
                                      Examples: {level.examples}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Access Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Clock className='h-5 w-5 text-blue-600' />
                  When can we access your unit?
                </CardTitle>
                <CardDescription>Select all times that work for you</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name='accessSchedule'
                  render={() => (
                    <FormItem>
                      <div className='space-y-3'>
                        {ACCESS_SCHEDULE_OPTIONS.map((option) => (
                          <FormField
                            key={option.value}
                            control={form.control}
                            name='accessSchedule'
                            render={({ field }) => (
                              <FormItem className='flex items-center space-x-3 space-y-0'>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const updated = checked
                                        ? [...current, option.value]
                                        : current.filter((v) => v !== option.value);
                                      field.onChange(updated);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className='font-normal cursor-pointer'>
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Access Notes */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <AlertCircle className='h-5 w-5 text-blue-600' />
                  Access Notes (Optional)
                </CardTitle>
                <CardDescription>
                  Any special instructions for accessing your unit?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name='accessNotes'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder='e.g., Friendly dog in bedroom, alarm code: 1234, please call before arriving'
                          className='bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include pet information, alarm codes, parking instructions, etc.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className='flex gap-3'>
              <Button 
                type='submit' 
                disabled={submitting} 
                className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold'
              >
                {submitting && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                {submitting ? 'Submitting Request...' : 'Submit Maintenance Request'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </main>
  );
}

// Made with Bob
