import ProductList from '@/components/shared/product/product-list';
import { getLatestProducts, getLatestProductsByCategory } from '@/lib/actions/product.actions';
import type { Product } from '@/types';

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

interface LatestProductSectionProps {
  title?: string;
  /**
   * Optional category name to filter products by, e.g. "Faith", "Funny", "Deals", "Christmas".
   * If omitted, the section will show the latest products from all categories.
   */
  category?: string;
  /**
   * Maximum number of products to show in this section.
   */
  limit?: number;
}

const LatestProductSection = async ({
  title = 'Faith Based',
  category,
  limit = 10,
}: LatestProductSectionProps) => {
  const rawProducts = (category
    ? await getLatestProductsByCategory(category, limit)
    : await getLatestProducts()) as RawProduct[];

  const products = normalizeProducts(rawProducts);

  if (!products || products.length === 0) return null;

  return <ProductList data={products} title={title} limit={limit} />;
};

export default LatestProductSection;
