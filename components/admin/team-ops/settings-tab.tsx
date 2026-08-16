'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, Clock, DollarSign, Calendar, 
  AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { getPayrollSettings, updatePayrollSettings } from '@/lib/actions/team-operations.actions';

interface PayrollSettings {
  payPeriodType: string;
  payPeriodStartDay: number;
  overtimeThreshold: number;
  dailyOvertimeThreshold: number | null;
  overtimeMultiplier: number;
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<PayrollSettings>({
    payPeriodType: 'biweekly',
    payPeriodStartDay: 1,
    overtimeThreshold: 40,
    dailyOvertimeThreshold: null,
    overtimeMultiplier: 1.5,
  });
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const result = await getPayrollSettings();
      if (result.success && result.settings) {
        setSettings({
          payPeriodType: result.settings.payPeriodType,
          payPeriodStartDay: result.settings.payPeriodStartDay,
          overtimeThreshold: Number(result.settings.overtimeThreshold),
          dailyOvertimeThreshold: result.settings.dailyOvertimeThreshold 
            ? Number(result.settings.dailyOvertimeThreshold) 
            : null,
          overtimeMultiplier: Number(result.settings.overtimeMultiplier),
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(field: keyof PayrollSettings, value: string | number | null) {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }

  async function handleSave() {
    startTransition(async () => {
      const result = await updatePayrollSettings({
        payPeriodType: settings.payPeriodType as 'weekly' | 'biweekly' | 'semimonthly' | 'monthly',
        payPeriodStartDay: settings.payPeriodStartDay,
        overtimeThreshold: settings.overtimeThreshold,
        dailyOvertimeThreshold: settings.dailyOvertimeThreshold || undefined,
        overtimeMultiplier: settings.overtimeMultiplier,
      });

      if (result.success) {
        toast.success('Settings saved!');
        setHasChanges(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-white/5 rounded-xl h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Payroll Settings
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Configure how payroll is calculated for your team
          </p>
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Pay Period Settings */}
      <Card className="border-white/10 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            Pay Period
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure how often employees are paid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Pay Period Type</Label>
              <Select 
                value={settings.payPeriodType} 
                onValueChange={(v) => handleChange('payPeriodType', v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
                  <SelectItem value="semimonthly">Semi-monthly (1st & 15th)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                {settings.payPeriodType === 'weekly' || settings.payPeriodType === 'biweekly' 
                  ? 'Start Day of Week' 
                  : 'Start Day of Month'
                }
              </Label>
              {settings.payPeriodType === 'weekly' || settings.payPeriodType === 'biweekly' ? (
                <Select 
                  value={settings.payPeriodStartDay.toString()} 
                  onValueChange={(v) => handleChange('payPeriodStartDay', parseInt(v))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={settings.payPeriodStartDay}
                  onChange={(e) => handleChange('payPeriodStartDay', parseInt(e.target.value))}
                  className="bg-white/5 border-white/10"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400 bg-blue-500/10 rounded-lg p-3">
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <span>
              Timesheets are automatically generated at the end of each pay period
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Settings */}
      <Card className="border-white/10 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            Overtime Rules
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure overtime thresholds and rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Weekly Overtime Threshold</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="168"
                  value={settings.overtimeThreshold}
                  onChange={(e) => handleChange('overtimeThreshold', parseFloat(e.target.value))}
                  className="bg-white/5 border-white/10 pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  hours
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hours worked beyond this are paid at overtime rate
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Overtime Multiplier</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="3"
                  step="0.1"
                  value={settings.overtimeMultiplier}
                  onChange={(e) => handleChange('overtimeMultiplier', parseFloat(e.target.value))}
                  className="bg-white/5 border-white/10 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  x
                </span>
              </div>
              <p className="text-xs text-slate-500">
                1.5x = time and a half, 2x = double time
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Daily Overtime (California)</Label>
              <Switch
                checked={settings.dailyOvertimeThreshold !== null}
                onCheckedChange={(checked) => 
                  handleChange('dailyOvertimeThreshold', checked ? 8 : null)
                }
              />
            </div>
            {settings.dailyOvertimeThreshold !== null && (
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={settings.dailyOvertimeThreshold}
                  onChange={(e) => handleChange('dailyOvertimeThreshold', parseFloat(e.target.value))}
                  className="bg-white/5 border-white/10 pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  hours
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500">
              California requires overtime for hours worked beyond 8 in a single day
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Check your local labor laws for overtime requirements
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Break Requirements */}
      <Card className="border-white/10 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Break Requirements
          </CardTitle>
          <CardDescription className="text-slate-400">
            Labor law compliance reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
              <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-white font-medium">Meal Break (30 minutes)</p>
                <p className="text-sm text-slate-400">
                  Required for shifts over 5 hours. Must be taken before the 5th hour.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
              <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-white font-medium">Rest Break (10 minutes)</p>
                <p className="text-sm text-slate-400">
                  Required every 4 hours worked. Paid break time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
              <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-white font-medium">Second Meal Break</p>
                <p className="text-sm text-slate-400">
                  Required for shifts over 10 hours.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3">
            <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span>
              These are California requirements. Check your state&apos;s labor laws for specific requirements.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Third-Party Payroll Integration */}
      <Card className="border-white/10 bg-slate-900/60 border-dashed">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-violet-400" />
            Payroll Provider Integration
            <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">Coming Soon</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Connect to professional payroll services for tax filing, direct deposit, and compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg p-3 mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Time tracking data can be exported to your payroll provider. We do not process payroll or tax withholdings directly.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-white/5">
              <h4 className="text-white font-medium">Gusto</h4>
              <p className="text-sm text-slate-400 mt-1">
                Full-service payroll with tax filing, direct deposit, benefits administration, and HR tools
              </p>
              <ul className="text-xs text-slate-500 mt-2 space-y-1">
                <li>• Automatic tax calculations & filing</li>
                <li>• Direct deposit to employees</li>
                <li>• W-2 and 1099 generation</li>
                <li>• Benefits & health insurance</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50 border border-white/5">
              <h4 className="text-white font-medium">Check (by Intuit)</h4>
              <p className="text-sm text-slate-400 mt-1">
                Embedded payroll API for seamless white-label integration
              </p>
              <ul className="text-xs text-slate-500 mt-2 space-y-1">
                <li>• API-first payroll infrastructure</li>
                <li>• Tax compliance in all 50 states</li>
                <li>• Contractor payments (1099)</li>
                <li>• Embedded in your workflow</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3">
            <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span>
              When integration is available, your time tracking data will sync automatically with your chosen payroll provider for accurate pay calculations.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
