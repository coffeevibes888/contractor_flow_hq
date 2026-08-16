'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createRecurringCharge } from '@/lib/actions/charge.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecurringCharge {
  id: string;
  description: string;
  amount: number;
  dayOfMonthToPost: number;
  status: string;
}

interface LeaseRecurringChargesProps {
  lease: {
    id: string;
    recurringCharges: RecurringCharge[];
  };
}

export function LeaseRecurringCharges({ lease }: LeaseRecurringChargesProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await createRecurringCharge({
        leaseId: lease.id,
        description,
        amount: parseFloat(amount),
        dayOfMonthToPost: parseInt(day, 10),
      });

      if (result.success) {
        toast({ description: 'Recurring charge added successfully.' });
        setShowAddForm(false);
        setDescription('');
        setAmount('');
        setDay('1');
        // Here you would typically trigger a refresh of the charges list
        // For now, we rely on the parent component's revalidation
      } else {
        toast({ variant: 'destructive', description: result.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', description: 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Recurring Charges</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(!showAddForm)}
          className="border-white/10 text-slate-300 hover:bg-slate-800 text-xs"
        >
          <PlusCircle className="w-3 h-3 mr-1" />
          Add New
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg border border-white/10 bg-slate-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly Rent"
                className="bg-slate-800/60 border-white/10 text-white text-sm h-9"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800/60 border-white/10 text-white text-sm h-9"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Day to Post</label>
              <Input
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="bg-slate-800/60 border-white/10 text-white text-sm h-9"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-500">
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Save Charge
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
        {lease.recurringCharges.length > 0 ? (
          <div className="space-y-2">
            {lease.recurringCharges.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-slate-300">{charge.description}</p>
                  <p className="text-xs text-slate-500">
                    Posts on day {charge.dayOfMonthToPost} of the month
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-200 font-medium">{formatCurrency(charge.amount)}</p>
                  <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] capitalize">
                    {charge.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">
            No recurring charges set up for this lease.
          </p>
        )}
      </div>
    </div>
  );
}
