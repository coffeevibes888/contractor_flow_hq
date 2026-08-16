'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Upload,
  Loader2,
  Camera,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface JobCompletionButtonProps {
  jobId: string;
  jobTitle: string;
  jobStatus: string;
}

export function JobCompletionButton({
  jobId,
  jobTitle,
  jobStatus,
}: JobCompletionButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  // Only show for jobs that are in progress
  if (!['in_progress', 'scheduled'].includes(jobStatus)) {
    return null;
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 10) {
      toast({
        title: 'Too many photos',
        description: 'You can upload up to 10 photos',
        variant: 'destructive',
      });
      return;
    }

    setPhotos([...photos, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreview(photoPreview.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Upload photos first if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('files', photo);
        });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload photos');
        }

        const uploadData = await uploadRes.json();
        photoUrls = uploadData.urls || [];
      }

      // Mark job as complete
      const res = await fetch(`/api/contractor/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completionNotes,
          completionPhotos: photoUrls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark job as complete');
      }

      toast({
        title: '🎉 Job Marked Complete!',
        description: 'The homeowner has been notified to review and approve the work.',
      });

      setShowDialog(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Mark as Complete
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-emerald-500" />
              Complete Job
            </DialogTitle>
            <DialogDescription>
              Mark "{jobTitle}" as complete and notify the homeowner for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Completion Photos */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Completion Photos (Optional)
              </Label>
              <p className="text-sm text-slate-600">
                Upload before and after photos to showcase your work
              </p>

              {photoPreview.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photoPreview.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 10 && (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer">
                    <CardContent className="py-8">
                      <div className="text-center space-y-2">
                        <Camera className="h-10 w-10 text-slate-400 mx-auto" />
                        <div>
                          <p className="font-medium text-slate-700">
                            Click to upload photos
                          </p>
                          <p className="text-sm text-slate-500">
                            {photos.length}/10 photos uploaded
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </label>
              )}
            </div>

            {/* Completion Notes */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-base font-semibold">
                Completion Notes (Optional)
              </Label>
              <p className="text-sm text-slate-600">
                Add any final notes about the completed work
              </p>
              <Textarea
                id="notes"
                placeholder="e.g., Replaced all fixtures, tested for leaks, cleaned up work area..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* What Happens Next */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  What Happens Next?
                </h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <p>Homeowner receives notification to review the completed work</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <p>Payment is held in escrow for 7 days for quality assurance</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <p>Funds are released to you after approval or automatically after 7 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
