import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import ProductPrice from './product-price';
import { Product } from '@/types';
import Rating from './rating';

type ProductWithSale = Product & {
  onSale?: boolean | null;
  saleUntil?: string | Date | null;
  salePercent?: number | string | null;
};

const ProductCard = ({ product }: { product: Product }) => {
  const extendedProduct = product as ProductWithSale;

  const isOnSaleActive = (() => {
    const onSale = extendedProduct.onSale ?? undefined;
    const saleUntil = extendedProduct.saleUntil ?? undefined;
    if (!onSale) return false;
    if (!saleUntil) return true;
    const end = new Date(saleUntil as string | number | Date);
    if (Number.isNaN(end.getTime())) return true;
    return end > new Date();
  })();

  const rawSalePercent = extendedProduct.salePercent ?? null;
  const salePercent = isOnSaleActive && rawSalePercent ? Number(rawSalePercent) : null;

  const originalPrice = Number(product.price);
  const salePrice = salePercent ? originalPrice * (1 - salePercent / 100) : originalPrice;

  const hasSecondImage = product.images && product.images.length > 1;
  const lowStock = product.stock > 0 && product.stock < 5;

  return (
    <Card className="bg-transparent border-white rounded-xl overflow-hidden shadow-sm">
      <CardHeader className="p-0 items-center relative">
        <Link href={`/product/${product.slug}`} className="block group">
          <div className="relative w-full overflow-hidden">
            <Image
              src={product.images[0]}
              alt={product.name}
              height={300}
              width={300}
              priority={true}
              className={`object-cover transition-opacity duration-300 ${
                hasSecondImage ? 'group-hover:opacity-0' : ''
              }`}
            />
            {hasSecondImage && (
              <Image
                src={product.images[1]}
                alt={product.name}
                height={300}
                width={300}
                className="object-cover absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            )}
          </div>
        </Link>
        {isOnSaleActive && salePercent && (
          <div className="absolute top-2 left-2 rounded-full bg-emerald-500 text-white text-[10px] px-2 py-1 font-semibold uppercase tracking-wide">
            -{Math.round(salePercent)}%
          </div>
        )}
      </CardHeader>

      <CardContent className="p-3 flex flex-col gap-2">
        <div className="text-xs opacity-80">{product.brand}</div>

        <Link href={`/product/${product.slug}`}>
          <h2 className="text-sm font-medium line-clamp-2">{product.name}</h2>
        </Link>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Rating value={Number(product.rating)} />
            <span className="text-[10px] text-slate-400">({product.numReviews})</span>
          </div>

          {product.stock > 0 ? (
            salePercent ? (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="line-through text-[11px] text-slate-400">
                    ${originalPrice.toFixed(2)}
                  </span>
                  <ProductPrice value={salePrice} className="text-sm" />
                </div>
                {lowStock && (
                  <span className="text-[10px] text-orange-500">Only {product.stock} left</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-0.5">
                <ProductPrice value={originalPrice} className="text-sm" />
                {lowStock && (
                  <span className="text-[10px] text-orange-500">Only {product.stock} left</span>
                )}
              </div>
            )
          ) : (
            <p className="text-destructive text-xs">Out Of Stock</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
