"use server";
import { prisma } from '@/db/prisma';
import { convertToPlainObject, formatError } from '../utils';
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from '../constants';
import { revalidatePath } from 'next/cache';
import { insertProductSchema, updateProductSchema } from '../validators';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getOrCreateCurrentLandlord } from './landlord.actions';
import { canAddUnits } from './subscription.actions';
import { uploadUrlToCloudinary } from '@/lib/cloudinary';

// Type for variant creation
type VariantInput = {
  productId: string;
  colorId?: string;
  sizeId?: string;
  price: number;
  stock: number;
  images: string[];
};

async function migrateImagesToCloudinary(images: string[], landlordId: string) {
  const normalized = (images || []).filter(Boolean);
  const migrated: string[] = [];

  for (const url of normalized) {
    if (typeof url === 'string' && url.includes('res.cloudinary.com')) {
      migrated.push(url);
      continue;
    }

    try {
      const result = await uploadUrlToCloudinary(url, {
        folder: ['propertyflowhq', 'landlords', landlordId, 'properties', 'photos'].join('/'),
        resource_type: 'image',
      });
      migrated.push(result.secure_url);
    } catch {
      // If the remote host blocks Cloudinary fetch, keep the original URL as a fallback.
      migrated.push(url);
    }
  }

  return migrated;
}

// Get latest products
export async function getLatestProducts(limit = LATEST_PRODUCTS_LIMIT) {
  const data = await prisma.product.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return convertToPlainObject(
    data.map((p) => ({
      ...p,
      subCategory: p.subCategory ?? undefined,
      price: Number(p.price),
      rating: Number(p.rating),
    }))
  );
}

// Get latest products for a specific category (for themed sections like Faith, Funny, Deals, etc.)
export async function getLatestProductsByCategory(category: string, limit = LATEST_PRODUCTS_LIMIT) {
  const data = await prisma.product.findMany({
    where: {
      OR: [
        { category: { equals: category, mode: 'insensitive' } },
        { subCategory: { equals: category, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return convertToPlainObject(
    data.map((p) => ({
      ...p,
      subCategory: p.subCategory ?? undefined,
      price: Number(p.price),
      rating: Number(p.rating),
    }))
  );
}

// Get single product by it's slug
export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug: slug },
    include: { variants: { include: { color: true, size: true } } },
  });
  return convertToPlainObject(product);
}

// Get all colors
export async function getAllColors() {
  return await prisma.color.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
}

// Get all sizes
export async function getAllSizes() {
  return await prisma.size.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
}

// Get variants for a product by product id
export async function getVariantsByProductId(productId: string) {
  return await prisma.productVariant.findMany({ where: { productId }, include: { color: true, size: true } });
}

// Get single product by it's ID
export async function getProductById(productId: string) {
  const data = await prisma.product.findFirst({
    where: { id: productId },
  });

  if (!data) return null;

  const normalized = {
    ...data,
    subCategory: data.subCategory ?? undefined,
    price: Number(data.price),
    rating: Number(data.rating),
  };

  return convertToPlainObject(normalized);
}

// Get all products
export async function getAllProducts({
  query,
  limit = PAGE_SIZE,
  page,
  category,
  price,
  rating,
  sort,
  sizeSlug,
  colorSlug,
  inStockOnly,
}: {
  query: string;
  limit?: number;
  page: number;
  category?: string;
  price?: string;
  rating?: string;
  sort?: string;
  sizeSlug?: string;
  colorSlug?: string;
  inStockOnly?: boolean;
}) {
  // Query filter
  const queryFilter: Prisma.ProductWhereInput =
    query && query !== 'all'
      ? {
          name: {
            contains: query,
            mode: 'insensitive',
          } as Prisma.StringFilter,
        }
      : {};

  // Category filter
  const categoryFilter = category && category !== 'all' ? { category } : {};

  // Price filter
  const priceFilter: Prisma.ProductWhereInput =
    price && price !== 'all'
      ? {
          price: {
            gte: Number(price.split('-')[0]),
            lte: Number(price.split('-')[1]),
          },
        }
      : {};

  // Rating filter
  const ratingFilter =
    rating && rating !== 'all'
      ? {
          rating: {
            gte: Number(rating),
          },
        }
      : {};

  const sizeFilter: Prisma.ProductWhereInput =
    sizeSlug && sizeSlug !== 'all'
      ? {
          variants: {
            some: {
              size: { slug: sizeSlug },
            },
          },
        }
      : {};

  const colorFilter: Prisma.ProductWhereInput =
    colorSlug && colorSlug !== 'all'
      ? {
          variants: {
            some: {
              color: { slug: colorSlug },
            },
          },
        }
      : {};

  const stockFilter: Prisma.ProductWhereInput = inStockOnly
    ? {
        OR: [
          { stock: { gt: 0 } },
          {
            variants: {
              some: {
                stock: { gt: 0 },
              },
            },
          },
        ],
      }
    : {};

  const where: Prisma.ProductWhereInput = {
    ...queryFilter,
    ...categoryFilter,
    ...priceFilter,
    ...ratingFilter,
    ...sizeFilter,
    ...colorFilter,
    ...stockFilter,
  };

  const data = await prisma.product.findMany({
    where,
    orderBy:
      sort === 'lowest'
        ? { price: 'asc' }
        : sort === 'highest'
        ? { price: 'desc' }
        : sort === 'rating'
        ? { rating: 'desc' }
        : { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const dataCount = await prisma.product.count({ where });

  return {
    data: data.map((p) => ({
      ...p,
      price: Number(p.price),
      rating: Number(p.rating),
    })),
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Delete a product
export async function deleteProduct(id: string) {
  try {
    const productExists = await prisma.product.findFirst({
      where: { id },
    });

    if (!productExists) throw new Error('Product not found');

    await prisma.product.delete({ where: { id } });

    revalidatePath('/admin/dashboard/properties');

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Create a product
export async function createProduct(data: z.infer<typeof insertProductSchema>) {
  try {
    const product = insertProductSchema.parse(data);
    
    // Extract only Product model fields, excluding sizeIds, colorIds, and property-specific fields
    const { sizeIds, colorIds, cleaningFee, petDepositAnnual, ...productData } = product;
    void colorIds; // suppress unused variable warning

    // Check subscription limits before creating units
    const unitCount = product.stock || 1;
    const subscriptionCheck = await canAddUnits(unitCount);
    
    if (!subscriptionCheck.allowed) {
      return {
        success: false,
        message: subscriptionCheck.reason,
        subscriptionError: true,
        currentUnitCount: subscriptionCheck.currentUnitCount,
        unitLimit: subscriptionCheck.unitLimit,
        currentTier: subscriptionCheck.currentTier,
        upgradeTier: subscriptionCheck.upgradeTier,
      };
    }
    
    // create product and optionally create variants from provided sizeIds
    const created = await prisma.product.create({ data: productData });

    if (sizeIds && sizeIds.length) {
      const variants: VariantInput[] = [];
      for (const sizeId of sizeIds) {
        variants.push({
          productId: created.id,
          sizeId,
          price: Number(product.price),
          stock: product.stock,
          images: product.images || [],
        });
      }
      if (variants.length) {
        await prisma.productVariant.createMany({ data: variants });
      }
    }

    // Also create a Property and Unit record for the property management system
    // This enables lease creation when applications are approved
    const propertyType = product.category || 'apartment';
    
    // Ensure there is a landlord workspace for this admin
    const landlordResult = await getOrCreateCurrentLandlord();

    if (!landlordResult.success) {
      throw new Error(landlordResult.message || 'Unable to determine landlord');
    }

    const migratedImages = await migrateImagesToCloudinary(
      (productData as any).images || [],
      landlordResult.landlord.id
    );

    (productData as any).images = migratedImages;

    const property = await prisma.property.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        address: {
          street: product.streetAddress || '',
          unit: product.unitNumber || '',
        },
        type: propertyType,
        landlordId: landlordResult.landlord.id,
        cleaningFee: product.cleaningFee !== undefined && product.cleaningFee !== null 
          ? product.cleaningFee 
          : null,
        petDepositAnnual: product.petDepositAnnual !== undefined && product.petDepositAnnual !== null 
          ? product.petDepositAnnual 
          : null,
      },
    });

    // Create units based on the stock/available units count
    const unitsToCreate = [];
    for (let i = 1; i <= unitCount; i++) {
      unitsToCreate.push({
        propertyId: property.id,
        name: unitCount === 1 ? (product.unitNumber || 'Unit 1') : `Unit ${i}`,
        type: propertyType,
        bedrooms: product.bedrooms ? Number(product.bedrooms) : null,
        bathrooms: product.bathrooms ? Number(product.bathrooms) : null,
        sizeSqFt: product.sizeSqFt ? Number(product.sizeSqFt) : null,
        rentAmount: Number(product.price),
        isAvailable: true,
        images: migratedImages,
      });
    }
    
    if (unitsToCreate.length > 0) {
      await prisma.unit.createMany({ data: unitsToCreate });
    }

    revalidatePath('/admin/dashboard/properties');

    return {
      success: true,
      message: 'Property created successfully',
      propertyId: property.id,
      propertyName: property.name,
    };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return {
        success: false,
        message:
          'A property with this slug already exists. Please change the property name or slug before saving.',
      };
    }

    return { success: false, message: formatError(error) };
  }
}

// Update a product
export async function updateProduct(data: z.infer<typeof updateProductSchema>) {
  try {
    const product = updateProductSchema.parse(data);
    
    // Check if this is a Product or a Property (wizard-created properties don't have Product records)
    const productExists = await prisma.product.findFirst({
      where: { id: product.id },
    });
    
    const propertyExists = await prisma.property.findFirst({
      where: { id: product.id },
    });

    if (!productExists && !propertyExists) {
      throw new Error('Property not found');
    }

    // Update product, property, and units to stay in sync
    await prisma.$transaction(async (tx) => {
      // Extract only Product model fields, excluding sizeIds, colorIds, and property-specific fields
      const { sizeIds, colorIds, cleaningFee, petDepositAnnual, ...productData } = product;
      void colorIds;

      // Migrate incoming images to Cloudinary for persistence.
      const landlordResult = await getOrCreateCurrentLandlord();
      if (landlordResult.success) {
        (productData as any).images = await migrateImagesToCloudinary(
          (productData as any).images || [],
          landlordResult.landlord.id
        );
      }
      
      // Only update Product if it exists (legacy system)
      if (productExists) {
        await tx.product.update({ where: { id: product.id }, data: productData });
      }

      // Find the property - either by ID (wizard) or by slug (legacy)
      const property = propertyExists || await tx.property.findFirst({ where: { slug: productExists?.slug } });
      
      if (property) {
        // Update Property
        await tx.property.update({
          where: { id: property.id },
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description,
            type: product.category || 'apartment',
            address: {
              street: product.streetAddress || '',
              unit: product.unitNumber || '',
            },
            cleaningFee: cleaningFee !== undefined && cleaningFee !== null ? cleaningFee : null,
            petDepositAnnual: petDepositAnnual !== undefined && petDepositAnnual !== null ? petDepositAnnual : null,
          },
        });

        // Sync Units under the property to reflect updated basics
        await tx.unit.updateMany({
          where: { propertyId: property.id },
          data: {
            type: product.category || 'apartment',
            bedrooms: product.bedrooms ? Number(product.bedrooms) : null,
            bathrooms: product.bathrooms ? Number(product.bathrooms) : null,
            sizeSqFt: product.sizeSqFt ? Number(product.sizeSqFt) : null,
            rentAmount: Number(product.price),
            images: (productData as any).images || [],
          },
        });
      }

      // If sizeIds provided and this is a legacy Product, remove existing variants and recreate
      if (productExists && sizeIds && sizeIds.length) {
        await tx.productVariant.deleteMany({ where: { productId: product.id } });
        const variants: VariantInput[] = [];
        for (const sizeId of sizeIds) {
          if (!sizeId) continue; // skip any empty size ids to avoid invalid UUIDs

          variants.push({
            productId: product.id,
            sizeId,
            price: Number(product.price),
            stock: product.stock,
            images: product.images || [],
          });
        }
        if (variants.length) {
          await tx.productVariant.createMany({ data: variants });
        }
      }
    });

    revalidatePath('/admin/dashboard/properties');

    return {
      success: true,
      message: 'Property updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get all categories
export async function getAllCategories() {
  const data = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
  });

  return data;
}

// Get category tree with distinct subcategories (for navigation menus)
export async function getCategoryTree() {
  const rows = await prisma.product.groupBy({
    by: ['category', 'subCategory'],
    _count: { _all: true },
  });

  const map = new Map<string, { count: number; subCategories: string[] }>();

  for (const row of rows) {
    const entry = map.get(row.category) ?? { count: 0, subCategories: [] };
    entry.count += row._count._all ?? 0;

    if (row.subCategory) {
      if (!entry.subCategories.includes(row.subCategory)) {
        entry.subCategories.push(row.subCategory);
      }
    }

    map.set(row.category, entry);
  }

  return Array.from(map.entries()).map(([category, value]) => ({
    category,
    count: value.count,
    subCategories: value.subCategories,
  }));
}

// Get featured products
export async function getFeaturedProducts() {
  const data = await prisma.product.findMany({
    where: { isFeatured: true },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return convertToPlainObject(
    data.map((p) => ({
      ...p,
      subCategory: p.subCategory ?? undefined,
      price: Number(p.price),
      rating: Number(p.rating),
    }))
  );
}