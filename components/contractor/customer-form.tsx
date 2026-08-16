'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { UpgradeModal } from '@/components/contractor/subscription/UpgradeModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CustomerFormProps {
  initialData?: any;
}

export function CustomerForm({ initialData }: CustomerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{
    current: number;
    limit: number;
    remaining: number;
    percentage: number;
    tier: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    status: initialData?.status || 'lead',
    source: initialData?.source || '',
    notes: initialData?.notes || [],
    tags: initialData?.tags || [],
  });

  // Fetch limit info on mount
  useEffect(() => {
    const fetchLimitInfo = async () => {
      try {
        const response = await fetch('/api/contractor/subscription/check-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature: 'customers' }),
        });

        if (response.ok) {
          const data = await response.json();
          setLimitInfo(data);
        }
      } catch (error) {
        console.error('Error fetching limit info:', error);
      }
    };

    fetchLimitInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contractor/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a subscription limit error
        if (data.error === 'SUBSCRIPTION_LIMIT_REACHED') {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(data.error || 'Failed to create customer');
      }

      toast({
        title: 'Success!',
        description: 'Customer created successfully',
      });

      router.push(`/contractor-dashboard/customers/${data.customer.id}`);
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create customer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRequiredTier = () => {
    if (!limitInfo) return 'pro';
    if (limitInfo.tier === 'starter') return 'pro';
    return 'enterprise';
  };

  const getRequiredLimit = () => {
    if (!limitInfo) return 500;
    if (limitInfo.tier === 'starter') return 500;
    return -1; // unlimited
  };

  // Shared input class so every field reads consistently against the
  // light contractor dashboard theme (white card on light gray bg).
  const inputClass =
    'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-violet-500';

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6">
        {/* Limit Warning Banner */}
        {limitInfo && limitInfo.limit !== -1 && (
          <Alert
            className={`${
              limitInfo.remaining === 0
                ? 'bg-red-50 border-red-200'
                : limitInfo.percentage >= 80
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
            }`}
          >
            <AlertCircle
              className={`h-4 w-4 ${
                limitInfo.remaining === 0
                  ? 'text-red-500'
                  : limitInfo.percentage >= 80
                    ? 'text-amber-500'
                    : 'text-blue-500'
              }`}
            />
            <AlertDescription className="text-gray-700">
              {limitInfo.remaining === 0 ? (
                <>
                  You've reached your limit of {limitInfo.limit} customers.{' '}
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="underline font-semibold text-violet-600 hover:text-violet-700"
                  >
                    Upgrade to {limitInfo.tier === 'starter' ? 'Pro' : 'Enterprise'}
                  </button>{' '}
                  for {limitInfo.tier === 'starter' ? '500 customers' : 'unlimited customers'}.
                </>
              ) : limitInfo.percentage >= 80 ? (
                <>
                  You're using {limitInfo.current} of {limitInfo.limit} customers (
                  {limitInfo.percentage}%). Consider{' '}
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="underline font-semibold text-violet-600 hover:text-violet-700"
                  >
                    upgrading
                  </button>{' '}
                  to avoid interruptions.
                </>
              ) : (
                <>You have {limitInfo.remaining} of {limitInfo.limit} customer slots remaining.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Info */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-base font-bold">
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-700 text-xs font-semibold mb-1.5 block">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={inputClass}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700 text-xs font-semibold mb-1.5 block">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className={inputClass}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-700 text-xs font-semibold mb-1.5 block">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-gray-700 text-xs font-semibold mb-1.5 block">
                Address
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={inputClass}
                placeholder="123 Main St, City, ST 12345"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="status"
                  className="text-gray-700 text-xs font-semibold mb-1.5 block"
                >
                  Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="lead">Lead</option>
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <Label
                  htmlFor="source"
                  className="text-gray-700 text-xs font-semibold mb-1.5 block"
                >
                  Source
                </Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className={inputClass}
                  placeholder="Referral, Website, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-base font-bold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes.join('\n')}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value.split('\n') })
              }
              className={inputClass}
              rows={4}
              placeholder="Internal notes about this customer..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || limitInfo?.remaining === 0}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm font-semibold"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Customer
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Upgrade Modal */}
      {limitInfo && (
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="customers"
          currentTier={limitInfo.tier}
          requiredTier={getRequiredTier()}
          currentLimit={limitInfo.limit}
          requiredLimit={getRequiredLimit()}
          benefits={
            limitInfo.tier === 'starter'
              ? [
                  '500 customers in database',
                  'Team management for up to 6 members',
                  'CRM features with customer portal',
                  'Lead management (100 active leads)',
                  'Basic inventory tracking (200 items)',
                  'Advanced scheduling and reporting',
                ]
              : [
                  'Unlimited customers',
                  'Unlimited team members',
                  'Advanced CRM with automation',
                  'Unlimited lead management',
                  'Full inventory management',
                  'Advanced analytics and API access',
                ]
          }
        />
      )}
    </form>
  );
}
