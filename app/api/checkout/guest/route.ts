import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { getMyCart } from "@/lib/actions/cart.actions";
import { insertOrderItemSchema, shippingAddressSchema } from "@/lib/validators";
import { formatError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestDetails } = body as {
      guestDetails?: {
        fullName?: string;
        email?: string;
        phone?: string;
        streetAddress?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      };
    };

    if (!guestDetails || !guestDetails.email || !guestDetails.phone) {
      return NextResponse.json(
        { success: false, message: "Missing guest contact details" },
        { status: 400 }
      );
    }

    const cart = await getMyCart();

    if (!cart || !cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Your cart is empty", redirectTo: "/cart" },
        { status: 400 }
      );
    }

    const shippingAddress = shippingAddressSchema.parse({
      fullName: guestDetails.fullName || "Guest",
      streetAddress: guestDetails.streetAddress || "",
      city: guestDetails.city || "",
      postalCode: guestDetails.postalCode || "",
      country: guestDetails.country || "",
    });

    const guestUser = await prisma.user.upsert({
      where: { email: guestDetails.email },
      update: {
        phoneNumber: guestDetails.phone,
      },
      create: {
        email: guestDetails.email,
        name: guestDetails.fullName || "Guest",
        phoneNumber: guestDetails.phone,
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: guestUser.id,
        shippingAddress,
        paymentMethod: "Stripe",
        itemsPrice: cart.itemsPrice,
        shippingPrice: cart.shippingPrice,
        taxPrice: cart.taxPrice,
        totalPrice: cart.totalPrice,
        isPaid: false,
        isDelivered: false,
        orderitems: {
          create: (cart.items || []).map((item) => {
            const validatedItem = insertOrderItemSchema.parse({
              productId: item.productId,
              slug: item.slug,
              image: item.image,
              name: item.name,
              price: item.price,
              qty: item.qty,
              variantId: item.variantId || null,
              variantColor: item.variantColor || null,
              variantSize: item.variantSize || null,
            });
            return validatedItem;
          }),
        },
      },
    });

    await prisma.cart.update({
      where: { id: cart.id },
      data: { items: [], totalPrice: 0, taxPrice: 0, shippingPrice: 0, itemsPrice: 0 },
    });

    return NextResponse.json({
      success: true,
      message: "Order created",
      redirectTo: `/order/${order.id}`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: formatError(error) },
      { status: 500 }
    );
  }
}
