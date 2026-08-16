"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { ApplicationWizard } from "@/components/tenant/application-wizard";

export default function ApplicationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const propertySlug = searchParams.get("property") ?? "";
  const [propertyName, setPropertyName] = useState<string>("");

  // Redirect to sign-up if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      const signUpUrl = propertySlug
        ? `/sign-up?fromProperty=true&propertySlug=${encodeURIComponent(propertySlug)}`
        : "/sign-up?fromProperty=true";
      router.push(signUpUrl);
    }
  }, [status, propertySlug, router]);

  // Fetch property name if we have a slug
  useEffect(() => {
    if (propertySlug) {
      fetch(`/api/products/slug/${propertySlug}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.name) {
            setPropertyName(data.name);
          }
        })
        .catch(() => {});
    }
  }, [propertySlug]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    router.push("/user/dashboard");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ApplicationWizard
      propertySlug={propertySlug}
      propertyName={propertyName || propertySlug}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
