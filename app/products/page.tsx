import ProductCard from '@/components/shared/product/product-card';
import { getAllProducts, getAllColors, getAllSizes } from '@/lib/actions/product.actions';
import { Product } from '@/types';
import Link from 'next/link';

type RawProduct = {
  salePercent?: unknown;
  saleUntil?: unknown;
  subCategory?: unknown;
  [key: string]: unknown;
};

const normalizeProducts = (products: RawProduct[]): Product[] =>
  products.map((product) => {
    const rawSaleUntil = product.saleUntil;
    const normalizedSaleUntil = rawSaleUntil
      ? new Date(rawSaleUntil as string | number | Date)
      : undefined;

    const rawSalePercent = product.salePercent;
    const normalizedSalePercent =
      rawSalePercent !== null && rawSalePercent !== undefined
        ? Number(rawSalePercent as number | string)
        : undefined;

    return {
      ...(product as Record<string, unknown>),
      subCategory: (product.subCategory as string | null | undefined) ?? undefined,
      salePercent: normalizedSalePercent,
      saleUntil:
        normalizedSaleUntil && !Number.isNaN(normalizedSaleUntil.getTime())
          ? normalizedSaleUntil.toISOString()
          : undefined,
    } as Product;
  });

const priceRanges = [
  { name: 'Any', value: 'all' },
  { name: '$1 to $50', value: '1-50' },
  { name: '$51 to $100', value: '51-100' },
  { name: '$101 to $200', value: '101-200' },
  { name: '$201 to $500', value: '201-500' },
];

const Products = async (props: {
  searchParams: Promise<{
    price?: string;
    size?: string;
    color?: string;
    inStock?: string;
  }>;
}) => {
  const { price = 'all', size = 'all', color = 'all', inStock = '0' } =
    await props.searchParams;

  const inStockOnly = inStock === '1';

  const [sizes, colors, productsResult] = await Promise.all([
    getAllSizes(),
    getAllColors(),
    getAllProducts({
      query: 'all',
      page: 1,
      limit: 60,
      category: 'all',
      price,
      rating: 'all',
      sort: 'newest',
      sizeSlug: size,
      colorSlug: color,
      inStockOnly,
    }),
  ]);

  const products = normalizeProducts(productsResult.data as RawProduct[]);

  const getFilterUrl = (next: {
    p?: string;
    s?: string;
    c?: string;
    i?: string;
  }) => {
    const params = new URLSearchParams({ price, size, color, inStock });
    if (next.p !== undefined) params.set('price', next.p);
    if (next.s !== undefined) params.set('size', next.s);
    if (next.c !== undefined) params.set('color', next.c);
    if (next.i !== undefined) params.set('inStock', next.i);
    return `/products?${params.toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shop All Products</h1>
          <p className="text-sm text-slate-500">
            Browse our latest drops, best sellers, and vibes in one place.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center text-xs border-b pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">Size:</span>
          <Link
            href={getFilterUrl({ s: 'all' })}
            className={size === 'all' ? 'font-semibold underline' : ''}
          >
            All
          </Link>
          {sizes.map((sz) => (
            <Link
              key={sz.id}
              href={getFilterUrl({ s: sz.slug })}
              className={size === sz.slug ? 'font-semibold underline' : ''}
            >
              {sz.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Color:</span>
          <Link
            href={getFilterUrl({ c: 'all' })}
            className={color === 'all' ? 'font-semibold underline' : ''}
          >
            All
          </Link>
          {colors.map((cl) => (
            <Link
              key={cl.id}
              href={getFilterUrl({ c: cl.slug })}
              className={color === cl.slug ? 'font-semibold underline' : ''}
            >
              {cl.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Price:</span>
          {priceRanges.map((pr) => (
            <Link
              key={pr.value}
              href={getFilterUrl({ p: pr.value })}
              className={price === pr.value ? 'font-semibold underline' : ''}
            >
              {pr.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Availability:</span>
          <Link
            href={getFilterUrl({ i: inStockOnly ? '0' : '1' })}
            className={inStockOnly ? 'font-semibold underline' : ''}
          >
            In stock only
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.length === 0 && <div>No products found.</div>}
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default Products;