'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateLateFeeSettings } from '@/lib/actions/settings.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

type LateFeeSettings = {
  enabled: boolean;
  gracePeriodDays: number;
  feeType: 'flat' | 'percentage';
  feeAmount: number;
  maxFee: number | null;
};

interface LateFeeSettingsFormProps {
  initialSettings: LateFeeSettings;
}

export function LateFeeSettingsForm({ initialSettings }: LateFeeSettingsFormProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(initialSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await updateLateFeeSettings({
        ...settings,
        gracePeriodDays: Number(settings.gracePeriodDays),
        feeAmount: Number(settings.feeAmount),
        maxFee: settings.maxFee ? Number(settings.maxFee) : null,
      });

      if (result.success) {
        toast({ description: 'Late fee settings updated successfully.' });
      } else {
        toast({ variant: 'destructive', description: result.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', description: 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <Card className="border-white/10 bg-slate-900/60">
      <CardHeader>
        <CardTitle className="text-white">Automatic Late Fees</CardTitle>
        <CardDescription className="text-slate-400">
          Define the rules for when and how late fees are applied to overdue rent payments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-white/10">
            <Label htmlFor="enabled" className="text-base text-white">Enable Automatic Late Fees</Label>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          <div className={`space-y-6 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                    <Input
                        id="gracePeriodDays"
                        name="gracePeriodDays"
                        type="number"
                        min="0"
                        value={settings.gracePeriodDays}
                        onChange={handleInputChange}
                        className="bg-slate-800/60 border-white/10 text-white"
                        placeholder="e.g., 5"
                    />
                    <p className="text-xs text-slate-400">Days after the due date before a fee is applied.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="feeType">Fee Type</Label>
                    <Select
                        name="feeType"
                        value={settings.feeType}
                        onValueChange={(value: 'flat' | 'percentage') => setSettings(prev => ({...prev, feeType: value}))}
                    >
                        <SelectTrigger className="bg-slate-800/60 border-white/10 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/10 text-white">
                            <SelectItem value="flat">Flat Amount</SelectItem>
                            <SelectItem value="percentage">Percentage of Rent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="feeAmount">
                        {settings.feeType === 'flat' ? 'Fee Amount ($)' : 'Fee Percentage (%)'}
                    </Label>
                    <Input
                        id="feeAmount"
                        name="feeAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.feeAmount}
                        onChange={handleInputChange}
                        className="bg-slate-800/60 border-white/10 text-white"
                        placeholder={settings.feeType === 'flat' ? '50.00' : '5'}
                    />
                </div>

                {settings.feeType === 'percentage' && (
                    <div className="space-y-2">
                        <Label htmlFor="maxFee">Maximum Fee ($) (Optional)</Label>
                        <Input
                            id="maxFee"
                            name="maxFee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={settings.maxFee || ''}
                            onChange={handleInputChange}
                            className="bg-slate-800/60 border-white/10 text-white"
                            placeholder="e.g., 200.00"
                        />
                         <p className="text-xs text-slate-400">A cap on the calculated percentage-based fee.</p>
                    </div>
                )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-500">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
