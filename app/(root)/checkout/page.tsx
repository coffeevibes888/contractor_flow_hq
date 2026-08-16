"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Cart } from "@/types";
import Link from "next/link";

// NOTE: This is a client wrapper that relies on the existing cart API routes/actions via fetch.
// It keeps implementation minimal while providing a unified checkout surface with guest fields.

type GuestDetails = {
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
};

const defaultGuestDetails: GuestDetails = {
  fullName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  postalCode: "",
  country: "",
};

const CheckoutPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [isPlacingOrder, startPlacingOrder] = useTransition();
  const [guestDetails, setGuestDetails] = useState<GuestDetails>(defaultGuestDetails);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const res = await fetch("/api/cart");
        if (!res.ok) {
          throw new Error("Failed to load cart");
        }
        const data = await res.json();
        if (!data || !data.items || data.items.length === 0) {
          router.push("/cart");
          return;
        }
        setCart(data as Cart);
      } catch {
        router.push("/cart");
      } finally {
        setIsLoadingCart(false);
      }
    };

    loadCart();
  }, [router]);

  const handleGuestChange = (field: keyof GuestDetails, value: string) => {
    setGuestDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!guestDetails.email || !guestDetails.phone || !guestDetails.streetAddress) {
      toast({
        variant: "destructive",
        description: "Please complete contact and shipping details before paying.",
      });
      return;
    }

    startPlacingOrder(async () => {
      try {
        const res = await fetch("/api/checkout/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestDetails }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          toast({
            variant: "destructive",
            description: data.message || "Failed to place order",
          });
          return;
        }

        if (data.redirectTo) {
          router.push(data.redirectTo as string);
          return;
        }

        router.push("/");
      } catch {
        toast({
          variant: "destructive",
          description: "Something went wrong while placing your order.",
        });
      }
    });
  };

  if (isLoadingCart) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!cart) {
    return null;
  }

  const totalItems = cart.items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 py-4">
        <h1 className="text-2xl">Fast, secure checkout</h1>
        <p className="text-xs text-slate-500">
          Need help?{' '}
          <Link href="/chat" className="underline">
            Chat with us
          </Link>
          .
        </p>
      </div>
      <div className="grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">Contact & Guest Details</h2>
              <div className="space-y-3">
                <Input
                  placeholder="Full Name"
                  value={guestDetails.fullName}
                  onChange={(e) => handleGuestChange("fullName", e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={guestDetails.email}
                  onChange={(e) => handleGuestChange("email", e.target.value)}
                />
                <Input
                  type="tel"
                  placeholder="Phone"
                  value={guestDetails.phone}
                  onChange={(e) => handleGuestChange("phone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">Shipping Address</h2>
              <div className="space-y-3">
                <Input
                  placeholder="Street Address"
                  value={guestDetails.streetAddress}
                  onChange={(e) => handleGuestChange("streetAddress", e.target.value)}
                />
                <Input
                  placeholder="City"
                  value={guestDetails.city}
                  onChange={(e) => handleGuestChange("city", e.target.value)}
                />
                <Input
                  placeholder="Postal Code"
                  value={guestDetails.postalCode}
                  onChange={(e) => handleGuestChange("postalCode", e.target.value)}
                />
                <Input
                  placeholder="Country"
                  value={guestDetails.country}
                  onChange={(e) => handleGuestChange("country", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span>Items ({totalItems})</span>
                <span>{formatCurrency(cart.itemsPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(cart.taxPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatCurrency(cart.shippingPrice)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-1">
                <span>Total</span>
                <span>{formatCurrency(cart.totalPrice)}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Secure checkout powered by Stripe. Wallets like Apple Pay, Google Pay, and Cash App may be available.
              </p>
              <Button
                className="w-full mt-2"
                disabled={isPlacingOrder}
                onClick={handleSubmit}
              >
                {isPlacingOrder ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}{" "}
                Pay Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
