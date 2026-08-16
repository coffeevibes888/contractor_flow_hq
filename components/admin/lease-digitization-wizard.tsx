'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { convertLeaseToDigital } from '@/lib/actions/document.actions';
import { toast } from '@/hooks/use-toast';

interface LeaseDigitizationWizardProps {
  document: any;
  properties: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function LeaseDigitizationWizard({
  document,
  properties,
  open,
  onOpenChange,
  onComplete,
}: LeaseDigitizationWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [leaseData, setLeaseData] = useState({
    tenantName: document.extractedData?.tenantName || '',
    tenantEmail: document.extractedData?.email || '',
    startDate: document.extractedData?.startDate || '',
    endDate: document.extractedData?.endDate || '',
    rentAmount: document.extractedData?.rentAmount || '',
    billingDayOfMonth: '1',
    status: 'active',
  });

  useEffect(() => {
    if (selectedProperty) {
      const property = properties.find((p) => p.id === selectedProperty);
      setUnits(property?.units || []);
      setSelectedUnit('');
    }
  }, [selectedProperty, properties]);

  const handleNext = () => {
    if (step === 1 && (!selectedProperty || !selectedUnit)) {
      toast({
        title: 'Missing Information',
        description: 'Please select a property and unit',
        variant: 'destructive',
      });
      return;
    }
    if (step === 2 && (!leaseData.tenantName || !leaseData.tenantEmail)) {
      toast({
        title: 'Missing Information',
        description: 'Please provide tenant name and email',
        variant: 'destructive',
      });
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await convertLeaseToDigital(document.id, {
        ...leaseData,
        unitId: selectedUnit,
      });

      if (result.success) {
        toast({
          title: 'Lease Created',
          description: 'The lease has been successfully digitized and added to your system.',
        });
        onComplete();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to create lease',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Convert Lease to Digital</DialogTitle>
          <DialogDescription className="text-slate-300">
            Step {step} of 3: {step === 1 ? 'Select Property & Unit' : step === 2 ? 'Tenant Information' : 'Lease Terms'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="property" className="text-slate-200">Property</Label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProperty && (
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-slate-200">Unit</Label>
                  <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                    <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} - ${unit.rentAmount}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tenantName" className="text-slate-200">Tenant Name</Label>
                <Input
                  id="tenantName"
                  value={leaseData.tenantName}
                  onChange={(e) => setLeaseData({ ...leaseData, tenantName: e.target.value })}
                  className="bg-slate-800/50 border-white/10 text-white"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantEmail" className="text-slate-200">Tenant Email</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  value={leaseData.tenantEmail}
                  onChange={(e) => setLeaseData({ ...leaseData, tenantEmail: e.target.value })}
                  className="bg-slate-800/50 border-white/10 text-white"
                  placeholder="john@example.com"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-slate-200">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={leaseData.startDate}
                    onChange={(e) => setLeaseData({ ...leaseData, startDate: e.target.value })}
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-slate-200">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={leaseData.endDate}
                    onChange={(e) => setLeaseData({ ...leaseData, endDate: e.target.value })}
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rentAmount" className="text-slate-200">Monthly Rent</Label>
                  <Input
                    id="rentAmount"
                    type="number"
                    step="0.01"
                    value={leaseData.rentAmount}
                    onChange={(e) => setLeaseData({ ...leaseData, rentAmount: e.target.value })}
                    className="bg-slate-800/50 border-white/10 text-white"
                    placeholder="1500.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingDay" className="text-slate-200">Billing Day of Month</Label>
                  <Input
                    id="billingDay"
                    type="number"
                    min="1"
                    max="28"
                    value={leaseData.billingDayOfMonth}
                    onChange={(e) => setLeaseData({ ...leaseData, billingDayOfMonth: e.target.value })}
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-200">Lease Status</Label>
                <Select
                  value={leaseData.status}
                  onValueChange={(value) => setLeaseData({ ...leaseData, status: value })}
                >
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onOpenChange(false))}
            className="border-white/20 text-white"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} className="bg-violet-500 hover:bg-violet-600">
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-violet-500 hover:bg-violet-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Lease
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
