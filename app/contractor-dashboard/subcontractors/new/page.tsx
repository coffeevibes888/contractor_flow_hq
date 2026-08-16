'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const specialtiesList = [
  'Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Flooring', 'Painting',
  'Carpentry', 'Masonry', 'Concrete', 'Landscaping', 'Demolition',
  'Insulation', 'Drywall', 'Tiling', 'Fencing', 'Gutters'
];

export default function NewSubcontractorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');

  const addSpecialty = () => {
    if (newSpecialty && !specialties.includes(newSpecialty)) {
      setSpecialties([...specialties, newSpecialty]);
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (s: string) => {
    setSpecialties(specialties.filter(spec => spec !== s));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: formData.get('companyName'),
      contactName: formData.get('contactName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      licenseNumber: formData.get('licenseNumber'),
      licenseState: formData.get('licenseState'),
      insuranceExpiry: formData.get('insuranceExpiry'),
      taxId: formData.get('taxId'),
      specialties,
      paymentTerms: formData.get('paymentTerms'),
      preferredPayment: formData.get('preferredPayment'),
      notes: formData.get('notes'),
    };

    try {
      const res = await fetch('/api/contractor/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast({ title: 'Subcontractor added successfully' });
        router.push('/contractor-dashboard/subcontractors');
      } else {
        throw new Error('Failed to create subcontractor');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add subcontractor', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/contractor-dashboard/subcontractors">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add Subcontractor</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" name="companyName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input id="contactName" name="contactName" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Licensing & Insurance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input id="licenseNumber" name="licenseNumber" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseState">License State</Label>
                <Input id="licenseState" name="licenseState" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiry">Insurance Expiry Date</Label>
                <Input id="insuranceExpiry" name="insuranceExpiry" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID (EIN)</Label>
                <Input id="taxId" name="taxId" placeholder="XX-XXXXXXX" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Specialties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {specialtiesList.map(specialty => (
                <Badge
                  key={specialty}
                  variant={specialties.includes(specialty) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    if (specialties.includes(specialty)) {
                      removeSpecialty(specialty);
                    } else {
                      setSpecialties([...specialties, specialty]);
                    }
                  }}
                >
                  {specialty}
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom specialty"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              />
              <Button type="button" onClick={addSpecialty} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {specialties.map(specialty => (
                  <Badge key={specialty} className="gap-1">
                    {specialty}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeSpecialty(specialty)} />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <select
                  id="paymentTerms"
                  name="paymentTerms"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_45">Net 45</option>
                  <option value="due_on_receipt">Due on Receipt</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredPayment">Preferred Payment Method</Label>
                <select
                  id="preferredPayment"
                  name="preferredPayment"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="check">Check</option>
                  <option value="ach">ACH/Bank Transfer</option>
                  <option value="wire">Wire Transfer</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="notes"
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
              placeholder="Any additional notes about this subcontractor..."
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Subcontractor
          </Button>
          <Link href="/contractor-dashboard/subcontractors">
            <Button variant="outline" disabled={loading}>Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
