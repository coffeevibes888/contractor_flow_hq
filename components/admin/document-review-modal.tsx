'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface DocumentReviewModalProps {
  document: any;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function DocumentReviewModal({
  document,
  open,
  onClose,
  onComplete,
}: DocumentReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!action) return;
    if (action === 'reject' && !reason) {
      alert('Please provide a rejection reason');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/verification/${document.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, notes }),
      });

      if (!response.ok) {
        throw new Error('Review submission failed');
      }

      onComplete();
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Review Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Applicant Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Applicant Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{document.application.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{document.application.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Property</p>
                <p className="font-medium">{document.application.propertyName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Unit</p>
                <p className="font-medium">{document.application.unitName}</p>
              </div>
            </div>
          </div>

          {/* Document Info */}
          <div>
            <h3 className="font-semibold mb-3">Document Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline">
                  {document.category === 'identity' ? 'Identity' : 'Employment'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">File Name</span>
                <span className="font-medium">{document.originalFileName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">OCR Confidence</span>
                <span className="font-medium">
                  {document.ocrConfidence ? `${document.ocrConfidence.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              {document.fraudScore !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fraud Score</span>
                  <span className="font-medium text-orange-600">
                    {document.fraudScore.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fraud Indicators */}
          {document.fraudIndicators && document.fraudIndicators.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-600">Fraud Indicators</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {document.fraudIndicators.map((indicator: string, index: number) => (
                  <li key={index}>{indicator.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Data */}
          {document.extractedData && (
            <div>
              <h3 className="font-semibold mb-3">Extracted Data</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                {Object.entries(document.extractedData).map(([key, value]: [string, any]) => {
                  if (key === 'confidence' || key === 'retryCount') return null;
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Document Preview */}
          {document.secureUrl && (
            <div>
              <h3 className="font-semibold mb-3">Document Preview</h3>
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                {document.mimeType === 'application/pdf' ? (
                  <div className="p-8 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">PDF Preview</p>
                    <Button
                      variant="outline"
                      onClick={() => window.open(document.secureUrl, '_blank')}
                    >
                      Open PDF in New Tab
                    </Button>
                  </div>
                ) : (
                  <img
                    src={document.secureUrl}
                    alt="Document"
                    className="w-full h-auto"
                  />
                )}
              </div>
            </div>
          )}

          {/* Review Actions */}
          <div className="space-y-4">
            <h3 className="font-semibold">Review Decision</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={action === 'approve' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setAction('approve')}
                className="h-auto py-4"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">Approve</div>
                  <div className="text-xs opacity-80">Document is valid</div>
                </div>
              </Button>

              <Button
                variant={action === 'reject' ? 'destructive' : 'outline'}
                size="lg"
                onClick={() => setAction('reject')}
                className="h-auto py-4"
              >
                <XCircle className="w-5 h-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">Reject</div>
                  <div className="text-xs opacity-80">Document is invalid</div>
                </div>
              </Button>
            </div>

            {action === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a clear reason for rejection..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this review..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!action || submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
