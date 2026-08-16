'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  listConnectBankAccounts,
  addConnectBankAccount,
  deleteConnectBankAccount,
  setDefaultConnectBankAccount,
  type ExternalBankAccount,
} from '@/lib/actions/stripe-bank-accounts.actions';
import {
  Building2,
  Plus,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

const addBankAccountSchema = z.object({
  accountHolderName: z.string().min(2, 'Name must be at least 2 characters'),
  routingNumber: z.string().length(9, 'Routing number must be 9 digits'),
  accountNumber: z.string().min(4, 'Account number must be at least 4 digits'),
  accountType: z.enum(['checking', 'savings']),
  setAsDefault: z.boolean().default(false),
});

type AddBankAccountForm = z.infer<typeof addBankAccountSchema>;

interface BankAccountSettingsProps {
  onNeedsOnboarding?: () => void;
}

export function BankAccountSettings({ onNeedsOnboarding }: BankAccountSettingsProps) {
  const [accounts, setAccounts] = useState<ExternalBankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasConnectAccount, setHasConnectAccount] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AddBankAccountForm>({
    resolver: zodResolver(addBankAccountSchema),
    defaultValues: {
      accountHolderName: '',
      routingNumber: '',
      accountNumber: '',
      accountType: 'checking',
      setAsDefault: false,
    },
  });

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    const result = await listConnectBankAccounts();
    
    if (result.success) {
      setAccounts(result.accounts);
      setHasConnectAccount(result.hasConnectAccount ?? false);
      setIsOnboarded(result.isOnboarded ?? false);
      setPayoutsEnabled(result.payoutsEnabled ?? false);
    } else {
      toast({
        variant: 'destructive',
        description: result.message,
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAddAccount = async (values: AddBankAccountForm) => {
    setIsSubmitting(true);
    
    const result = await addConnectBankAccount({
      accountHolderName: values.accountHolderName,
      routingNumber: values.routingNumber,
      accountNumber: values.accountNumber,
      accountType: values.accountType,
      setAsDefault: values.setAsDefault,
    });

    if (result.success) {
      toast({ description: result.message });
      setShowAddDialog(false);
      form.reset();
      await loadAccounts();
    } else {
      if ((result as any).needsOnboarding) {
        onNeedsOnboarding?.();
      }
      toast({
        variant: 'destructive',
        description: result.message,
      });
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (accountId: string) => {
    setDeletingId(accountId);
    
    const result = await deleteConnectBankAccount(accountId);
    
    if (result.success) {
      toast({ description: result.message });
      await loadAccounts();
    } else {
      toast({
        variant: 'destructive',
        description: result.message,
      });
    }
    
    setDeletingId(null);
  };

  const handleSetDefault = async (accountId: string) => {
    setSettingDefaultId(accountId);
    
    const result = await setDefaultConnectBankAccount(accountId);
    
    if (result.success) {
      toast({ description: result.message });
      await loadAccounts();
    } else {
      toast({
        variant: 'destructive',
        description: result.message,
      });
    }
    
    setSettingDefaultId(null);
  };


  // Not onboarded yet
  if (!hasConnectAccount || !isOnboarded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" />
            Bank Accounts
          </CardTitle>
          <CardDescription>
            Manage your payout bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Complete Stripe Setup First
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                You need to complete the Stripe onboarding process before you can manage bank accounts.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onNeedsOnboarding}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Complete Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-500" />
              Bank Accounts
            </CardTitle>
            <CardDescription>
              Manage your payout bank accounts for receiving rent payments
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadAccounts}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Bank
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status indicator */}
        {payoutsEnabled ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              Payouts are enabled. Rent payments will be deposited to your default bank account.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              Payouts are pending verification. Please ensure your account information is complete.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No bank accounts</p>
            <p className="text-xs mt-1">Add a bank account to receive payouts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {account.bankName || 'Bank Account'}
                      </p>
                      {account.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      •••• {account.last4}
                      {account.accountHolderName && (
                        <span className="ml-2">· {account.accountHolderName}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(account.id)}
                      disabled={settingDefaultId === account.id}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      {settingDefaultId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                    disabled={deletingId === account.id || accounts.length === 1}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title={accounts.length === 1 ? 'Cannot delete the only bank account' : 'Delete bank account'}
                  >
                    {deletingId === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Bank Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Add a new bank account for receiving payouts
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddAccount)} className="space-y-4">
              <FormField
                control={form.control}
                name="accountHolderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Holder Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John Doe"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="routingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routing Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="110000000"
                        maxLength={9}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="000123456789"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setAsDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set as default payout account</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Bank Account'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>

          <p className="text-xs text-slate-500 mt-2">
            Your bank account information is securely encrypted and processed by Stripe.
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
