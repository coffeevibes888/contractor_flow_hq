'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Receipt, FileCheck, AlertCircle, Loader2 } from 'lucide-react';
import { classifyDocument } from '@/lib/actions/document.actions';
import { toast } from '@/hooks/use-toast';

interface DocumentClassificationWizardProps {
  document: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function DocumentClassificationWizard({
  document,
  open,
  onOpenChange,
  onComplete,
}: DocumentClassificationWizardProps) {
  const [documentType, setDocumentType] = useState(document.documentType || '');
  const [extractedData, setExtractedData] = useState(document.extractedData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await classifyDocument(document.id, documentType, extractedData);
      
      if (result.success) {
        toast({
          title: 'Document Classified',
          description: 'Document has been classified successfully.',
        });
        onComplete();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to classify document',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (documentType) {
      case 'lease':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName" className="text-slate-200">Tenant Name</Label>
              <Input
                id="tenantName"
                value={extractedData.tenantName || ''}
                onChange={(e) => setExtractedData({ ...extractedData, tenantName: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-slate-200">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={extractedData.startDate || ''}
                onChange={(e) => setExtractedData({ ...extractedData, startDate: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-slate-200">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={extractedData.endDate || ''}
                onChange={(e) => setExtractedData({ ...extractedData, endDate: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentAmount" className="text-slate-200">Monthly Rent</Label>
              <Input
                id="rentAmount"
                type="number"
                step="0.01"
                value={extractedData.rentAmount || ''}
                onChange={(e) => setExtractedData({ ...extractedData, rentAmount: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="1500.00"
              />
            </div>
          </div>
        );
      
      case 'receipt':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-200">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={extractedData.amount || ''}
                onChange={(e) => setExtractedData({ ...extractedData, amount: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="1500.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date" className="text-slate-200">Payment Date</Label>
              <Input
                id="date"
                type="date"
                value={extractedData.date || ''}
                onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-slate-200">Payment Method</Label>
              <Select
                value={extractedData.paymentMethod || ''}
                onValueChange={(value) => setExtractedData({ ...extractedData, paymentMethod: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="money_order">Money Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidBy" className="text-slate-200">Paid By</Label>
              <Input
                id="paidBy"
                value={extractedData.paidBy || ''}
                onChange={(e) => setExtractedData({ ...extractedData, paidBy: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="Tenant name"
              />
            </div>
          </div>
        );
      
      case 'application':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="applicantName" className="text-slate-200">Applicant Name</Label>
              <Input
                id="applicantName"
                value={extractedData.applicantName || ''}
                onChange={(e) => setExtractedData({ ...extractedData, applicantName: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                value={extractedData.email || ''}
                onChange={(e) => setExtractedData({ ...extractedData, email: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Phone</Label>
              <Input
                id="phone"
                value={extractedData.phone || ''}
                onChange={(e) => setExtractedData({ ...extractedData, phone: e.target.value })}
                className="bg-slate-800/50 border-white/10 text-white"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Classify Document</DialogTitle>
          <DialogDescription className="text-slate-300">
            Review and correct the extracted information from this document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="documentType" className="text-slate-200">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lease">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Lease Agreement
                  </div>
                </SelectItem>
                <SelectItem value="receipt">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Payment Receipt
                  </div>
                </SelectItem>
                <SelectItem value="application">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Rental Application
                  </div>
                </SelectItem>
                <SelectItem value="notice">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Notice/Letter
                  </div>
                </SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {documentType && renderTypeSpecificFields()}

          {document.ocrText && (
            <div className="space-y-2">
              <Label className="text-slate-200">Extracted Text (OCR)</Label>
              <Textarea
                value={document.ocrText}
                readOnly
                className="bg-slate-800/50 border-white/10 text-slate-300 h-32"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!documentType || isSubmitting}
            className="bg-violet-500 hover:bg-violet-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Classifying...
              </>
            ) : (
              'Classify Document'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
