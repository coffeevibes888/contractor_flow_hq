import { getProductBySlug } from '@/lib/actions/product.actions';
import { notFound } from 'next/navigation';
import ReviewList from './review-list';
import { auth } from '@/auth';
import ProductDetailClient from '@/components/shared/product/product-detail-client';

const ProductDetailsPage = async (props: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await props.params;

  const [userId, product] = await Promise.all([
    (async () => {
      const session = await auth();
      return session?.user?.id;
    })(),
    getProductBySlug(slug),
  ]);

  if (!product) notFound();

  const clientProduct = {
    ...product,
    // Ensure numeric fields are numbers for the client component typing
    price: Number(product.price),
    rating: Number(product.rating),
    variants: (product.variants || []).map((v) => ({
      id: v.id,
      price: Number(v.price),
      images: v.images as string[] | undefined,
      color: v.color
        ? { id: v.color.id, name: v.color.name, slug: v.color.slug }
        : null,
      size: v.size
        ? { id: v.size.id, name: v.size.name, slug: v.size.slug }
        : null,
    })),
  };

  return (
    <>
      <ProductDetailClient product={clientProduct} />
      <section className='mt-10'>
        <h2 className='h2-bold mb-5'>Customer Reviews</h2>
        <ReviewList
          userId={userId || ''}
          productId={product.id}
          productSlug={product.slug}
        />
      </section>
    </>
  );
};

export default ProductDetailsPage;
