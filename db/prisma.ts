import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { decryptField, encryptField } from '@/lib/encrypt';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaNeon({ connectionString });

const prismaBase = new PrismaClient({ adapter });

/**
 * Recursively walk an arbitrary Prisma result and decrypt every Message-like
 * row's `content` field in place.
 *
 * Why this exists:
 *   The original `message` query extension below only fires when callers go
 *   through `prisma.message.findX()` directly. As soon as a parent like
 *   `prisma.thread.findFirst({ include: { messages: ... } })` pulls messages
 *   along for the ride, the extension is bypassed and the raw ciphertext
 *   leaks through to the UI (e.g. the contractor profile chat showing
 *   `+2JRl1qc9ADyl0...` instead of the actual message).
 *
 *   We tag every encrypted value in `lib/encrypt.ts` so we can reliably
 *   recognize one even when it's nested inside a parent row, and only
 *   attempt to decrypt strings that look like ours.
 */
async function decryptMessagesIn(result: unknown): Promise<void> {
  if (!result) return;
  if (Array.isArray(result)) {
    await Promise.all(result.map((item) => decryptMessagesIn(item)));
    return;
  }
  if (typeof result !== 'object') return;

  const row = result as Record<string, unknown>;

  // If the row itself looks like a Message (has a string `content` and a
  // `threadId`), decrypt content. Many other models also have a `content`
  // field, so use threadId as a discriminator to avoid touching them.
  if (typeof row.content === 'string' && typeof row.threadId === 'string') {
    try {
      row.content = await decryptField(row.content);
    } catch {
      // Leave the value untouched if it isn't actually encrypted (older
      // plaintext rows pre-encryption shouldn't fail the whole request).
    }
  }

  // Walk into common nested shapes that Prisma uses for `include`.
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (value && typeof value === 'object') {
      await decryptMessagesIn(value);
    }
  }
}

export const prisma = prismaBase
  .$extends({
    query: {
      message: {
        async create({ args, query }) {
          if (args.data && typeof (args.data as any).content === 'string') {
            (args.data as any).content = await encryptField(
              (args.data as any).content as string
            );
          }
          const result = await query(args);
          if (result && typeof (result as any).content === 'string') {
            (result as any).content = await decryptField(
              (result as any).content as string
            );
          }
          return result;
        },
        async createMany({ args, query }) {
          if (Array.isArray((args as any).data)) {
            for (const item of (args as any).data) {
              if (item && typeof item.content === 'string') {
                item.content = await encryptField(item.content);
              }
            }
          } else if ((args as any).data && typeof (args as any).data.content === 'string') {
            (args as any).data.content = await encryptField(
              (args as any).data.content as string
            );
          }
          return query(args);
        },
        async update({ args, query }) {
          if (args.data && typeof (args.data as any).content === 'string') {
            (args.data as any).content = await encryptField(
              (args.data as any).content as string
            );
          }
          const result = await query(args);
          if (result && typeof (result as any).content === 'string') {
            (result as any).content = await decryptField(
              (result as any).content as string
            );
          }
          return result;
        },
        async updateMany({ args, query }) {
          if (Array.isArray((args as any).data)) {
            for (const item of (args as any).data) {
              if (item && typeof item.content === 'string') {
                item.content = await encryptField(item.content);
              }
            }
          } else if ((args as any).data && typeof (args as any).data.content === 'string') {
            (args as any).data.content = await encryptField(
              (args as any).data.content as string
            );
          }
          return query(args);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result && typeof (result as any).content === 'string') {
            (result as any).content = await decryptField(
              (result as any).content as string
            );
          }
          return result;
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          if (result && typeof (result as any).content === 'string') {
            (result as any).content = await decryptField(
              (result as any).content as string
            );
          }
          return result;
        },
        async findMany({ args, query }) {
          const result = await query(args);
          if (Array.isArray(result)) {
            for (const m of result as any[]) {
              if (m && typeof m.content === 'string') {
                m.content = await decryptField(m.content);
              }
            }
          }
          return result;
        },
      },
      // Thread queries that `include` messages bypass the per-model
      // message handlers above (Prisma's query extension only fires for
      // the directly-queried model). We attach a generic decryption pass
      // to every Thread read so nested messages come back in plaintext.
      thread: {
        async findUnique({ args, query }) {
          const result = await query(args);
          await decryptMessagesIn(result);
          return result;
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          await decryptMessagesIn(result);
          return result;
        },
        async findMany({ args, query }) {
          const result = await query(args);
          await decryptMessagesIn(result);
          return result;
        },
      },
    },
  })
  .$extends({
    result: {
      product: {
        price: {
          compute(product) {
            return product.price.toString();
          },
        },
        rating: {
          compute(product) {
            return product.rating.toString();
          },
        },
      },
      cart: {
        itemsPrice: {
          needs: { itemsPrice: true },
          compute(cart) {
            return cart.itemsPrice.toString();
          },
        },
        shippingPrice: {
          needs: { shippingPrice: true },
          compute(cart) {
            return cart.shippingPrice.toString();
          },
        },
        taxPrice: {
          needs: { taxPrice: true },
          compute(cart) {
            return cart.taxPrice.toString();
          },
        },
        totalPrice: {
          needs: { totalPrice: true },
          compute(cart) {
            return cart.totalPrice.toString();
          },
        },
      },
      order: {
        itemsPrice: {
          needs: { itemsPrice: true },
          compute(order) {
            return order.itemsPrice.toString();
          },
        },
        shippingPrice: {
          needs: { shippingPrice: true },
          compute(order) {
            return order.shippingPrice.toString();
          },
        },
        taxPrice: {
          needs: { taxPrice: true },
          compute(order) {
            return order.taxPrice.toString();
          },
        },
        totalPrice: {
          needs: { totalPrice: true },
          compute(order) {
            return order.totalPrice.toString();
          },
        },
      },
      orderItem: {
        price: {
          compute(orderItem) {
            return orderItem.price.toString();
          },
        },
      },
    },
  });

/**
 * Transaction client type derived from the extended prisma instance.
 * Use this instead of Prisma.TransactionClient whenever passing `tx`
 * from a prisma.$transaction() callback — the base Prisma.TransactionClient
 * is incompatible with extended clients.
 */
export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;