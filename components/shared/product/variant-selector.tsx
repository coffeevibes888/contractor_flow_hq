"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader } from 'lucide-react';
import AddToCart from './add-to-cart';
import { Cart, CartItem } from '@/types';
import ProductPrice from '@/components/shared/product/product-price';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addItemToCart } from '@/lib/actions/cart.actions';

export type Variant = {
  id: string;
  sku?: string | null;
  price: string | number;
  stock?: number;
  images?: string[];
  printfulExternalId?: string | null;
  color?: { id: string; name: string; slug: string; hex?: string | null; createdAt?: Date; active?: boolean } | null;
  size?: { id: string; name: string; slug: string; createdAt?: Date; active?: boolean } | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  images?: string[];
  imageColors?: string[];
};

export default function VariantSelector({
  variants,
  product,
  cart,
  onColorSelected,
  onVariantChange,
}: {
  variants: Variant[];
  product: Product;
  cart?: Cart;
  onColorSelected?: (colorSlug: string | undefined, colorName: string | undefined) => void;
  onVariantChange?: (variant: Variant | undefined) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const colors = useMemo(() => {
    let filtered = variants;
    if (selectedSize) {
      filtered = filtered.filter((v) => v.size?.slug === selectedSize);
    }
    const map = new Map<string, { id: string; name: string; slug: string; hex?: string | null }>();
    filtered.forEach((v) => {
      if (v.color) map.set(v.color.slug, v.color);
    });
    return Array.from(map.values());
  }, [variants, selectedSize]);

  const imageColors = useMemo(() => {
    if (!product.imageColors || !product.images || product.imageColors.length === 0) {
      return [] as { id: string; name: string; slug: string }[];
    }

    const seen = new Map<string, { id: string; name: string; slug: string }>();
    product.imageColors.forEach((name) => {
      if (!name) return;
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      if (!seen.has(slug)) {
        seen.set(slug, { id: slug, name, slug });
      }
    });

    return Array.from(seen.values());
  }, [product.imageColors, product.images]);

  const sizes = useMemo(() => {
    let filtered = variants;

    // Only filter sizes by selectedColor when we have real variant-based colors.
    // If colors are coming only from imageColors, keep all sizes visible.
    if (colors.length > 0 && selectedColor) {
      filtered = filtered.filter((v) => v.color?.slug === selectedColor);
    }

    const map = new Map<string, { id: string; name: string; slug: string }>();
    filtered.forEach((v) => {
      if (v.size) map.set(v.size.slug, v.size);
    });
    return Array.from(map.values());
  }, [variants, selectedColor, colors.length]);

  const effectiveColors = colors.length > 0 ? colors : imageColors;

  const selectedVariant = useMemo(() => {
    let filtered = variants;

    // Only filter by selectedColor when we actually have variant-based colors.
    // When colors come from imageColors only, keep all variants and filter by size only.
    if (colors.length > 0 && selectedColor) {
      filtered = filtered.filter((v) => v.color?.slug === selectedColor);
    }

    if (selectedSize) {
      filtered = filtered.filter((v) => v.size?.slug === selectedSize);
    }

    console.log('[VariantSelector] Selected variant:', filtered[0]);
    return filtered[0];
  }, [variants, selectedColor, selectedSize, colors.length]);

  const variantImage = selectedVariant?.images?.[0];
  const productImage = product.images?.[0];
  const image = variantImage || productImage;
  
  console.log('[VariantSelector] Image to display:', image);
  console.log('[VariantSelector] Variant images:', selectedVariant?.images);

  const item: CartItem = {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    qty: quantity,
    image: image || '',
    price: Number(selectedVariant?.price ?? product.price),
    variantId: selectedVariant?.id,
    variantColor: selectedVariant?.color?.name,
    variantSize: selectedVariant?.size?.name,
  } as unknown as CartItem;

  const hasRequiredSelections = () => {
    // If there are no variants, we don't require a selectedVariant.
    if (!selectedVariant && variants.length > 0) return false;
    if (effectiveColors.length === 0 && sizes.length === 0) return true;
    if (effectiveColors.length > 0 && !selectedColor) return false;
    if (sizes.length > 0 && !selectedSize) return false;
    return true;
  };

  const shouldShowButton = hasRequiredSelections();
  const shouldShowMessage = !hasRequiredSelections();

  const router = useRouter();
  const { toast } = useToast();
  const [isBuying, startBuying] = useTransition();

  useEffect(() => {
    if (onColorSelected && selectedColor) {
      const colorName = effectiveColors.find(c => c.slug === selectedColor)?.name;
      console.log('[VariantSelector] Color changed to:', selectedColor, colorName);
      onColorSelected(selectedColor, colorName);
    } else if (onColorSelected && !selectedColor) {
      // Color was deselected
      onColorSelected(undefined, undefined);
    }
  }, [selectedColor, onColorSelected, effectiveColors]);

  useEffect(() => {
    if (onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, [selectedVariant, onVariantChange]);

  if (!mounted) {
    return null;
  }

  return (
    <div className='space-y-4'>
      {effectiveColors.length > 0 && (
        <div>
          <label className='block text-sm font-medium mb-1'>Color</label>
          <select
            className='w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            value={selectedColor || ''}
            onChange={(e) => {
              const newColor = e.target.value || undefined;
              console.log('[VariantSelector] Color dropdown changed:', newColor);
              setSelectedColor(newColor);
            }}
          >
            <option value=''>Select color</option>
            {effectiveColors.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {sizes.length > 0 && (
        <div>
          <label className='block text-sm font-medium mb-1'>Size</label>
          <select
            className='w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            value={selectedSize || ''}
            onChange={(e) => {
              const newSize = e.target.value || undefined;
              console.log('[VariantSelector] Size dropdown changed:', newSize);
              setSelectedSize(newSize);
            }}
          >
            <option value=''>Select size</option>
            {sizes.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className='flex items-center justify-between gap-4'>
        <ProductPrice value={Number(selectedVariant?.price ?? product.price)} />
        <div className='flex items-center gap-2'>
          <label className='text-sm'>Qty</label>
          <input
            type='number'
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => {
              const val = Number(e.target.value) || 1;
              setQuantity(Math.min(Math.max(val, 1), 99));
            }}
            className='w-16 h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          />
        </div>
      </div>

      {shouldShowButton ? (
        <div className='flex flex-col gap-2'>
          <AddToCart cart={cart} item={item} />
          <Button
            type='button'
            className='w-full'
            disabled={isBuying}
            onClick={() => {
              if (!hasRequiredSelections()) {
                toast({
                  variant: 'destructive',
                  description: 'Please select required options before buying now.',
                });
                return;
              }

              startBuying(async () => {
                const res = await addItemToCart(item);

                if (!res.success) {
                  toast({
                    variant: 'destructive',
                    description: res.message,
                  });
                  return;
                }

                router.push('/checkout');
              });
            }}
          >
            {isBuying ? (
              <Loader className='w-4 h-4 animate-spin' />
            ) : (
              'Buy Now'
            )}
          </Button>
        </div>
      ) : shouldShowMessage ? (
        <p className='text-sm text-gray-500'>Please select color and size</p>
      ) : null}
    </div>
  );
}