'use client';

import { useRouter } from 'next/navigation';
import { Check, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createOrder } from '@/lib/actions/order-actions';
import { paymentMethodSchema } from '@/lib/validators';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_PAYMENT_METHOD } from '@/lib/constants';
import { updateUserPaymentMethod, getSavedPaymentMethods } from '@/lib/actions/user.actions';
import { useTransition, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';

type SavedPaymentMethod = {
  id: string;
  type: string;
  last4: string;
  cardholderName?: string;
  isDefault: boolean;
  isVerified: boolean;
};

const PlaceOrderForm = ({ preferredPaymentMethod }: { preferredPaymentMethod: string | null }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | undefined>(undefined);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  const form = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: preferredPaymentMethod || DEFAULT_PAYMENT_METHOD,
    },
  });

  useEffect(() => {
    const fetchSavedMethods = async () => {
      const result = await getSavedPaymentMethods();
      if (result.success) {
        const methods = result.methods as SavedPaymentMethod[];
        setSavedMethods(methods.filter((m) => m.isVerified));

        const defaultMethod = methods.find((m) => m.isDefault && m.isVerified);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        }
      }
      setIsLoadingMethods(false);
    };

    fetchSavedMethods();
  }, []);

  const handleSubmit = async (values: z.infer<typeof paymentMethodSchema>) => {
    startTransition(async () => {
      let paymentType = values.type;

      if (selectedMethodId) {
        const selectedMethod = savedMethods.find((m) => m.id === selectedMethodId);
        if (selectedMethod) {
          paymentType = selectedMethod.type;
        }
      }

      const updateRes = await updateUserPaymentMethod({ type: paymentType });

      if (!updateRes.success) {
        toast({
          variant: 'destructive',
          description: updateRes.message,
        });
        return;
      }

      const res = await createOrder();

      if (!res.success) {
        toast({
          variant: 'destructive',
          description: res.message || 'Failed to place order',
        });
      }

      if (res.redirectTo) {
        router.push(res.redirectTo);
      }
    });
  };

  const PlaceOrderButton = () => {
    return (
      <Button type='submit' disabled={isPending} className='w-full'>
        {isPending ? (
          <Loader className='w-4 h-4 animate-spin' />
        ) : (
          <Check className='w-4 h-4' />
        )}{' '}
        Pay Now
      </Button>
    );
  };

  return (
    <>
      <div className='space-y-4 mb-4'>
        {!isLoadingMethods && savedMethods.length > 0 && (
          <div className='border rounded-lg p-4 bg-muted'>
            <Label className='mb-3 block'>Use Saved Payment Method</Label>
            <Select
              value={selectedMethodId}
              onValueChange={(val) => setSelectedMethodId(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a saved payment method' />
              </SelectTrigger>
              <SelectContent>
                {savedMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.cardholderName && `${method.cardholderName} - `}
                    {method.type} •••• {method.last4}
                    {method.isDefault && ' (Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='w-full'
          >
            <PlaceOrderButton />
          </form>
        </Form>
      </div>
    </>
  );
};

export default PlaceOrderForm;
