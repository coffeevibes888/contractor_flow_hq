"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

interface SubdomainApplyButtonProps {
  propertySlug: string;
  size?: 'sm' | 'default' | 'lg';
}

export function SubdomainApplyButton({ propertySlug, size = 'default' }: SubdomainApplyButtonProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // Extract subdomain from pathname (e.g., /landlord-slug/properties/... -> landlord-slug)
  const subdomain = pathname.split('/')[1];

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    default: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const buttonClass = `mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 ${sizeClasses[size]} font-semibold text-white hover:bg-violet-600 transition-all hover:scale-105 group`;

  // If user is a tenant, send them straight to the application
  if (session?.user?.role === "tenant") {
    return (
      <Link
        href={`/${subdomain}/application?property=${encodeURIComponent(propertySlug)}`}
        className={buttonClass}
      >
        Apply Now
      </Link>
    );
  }

  // If not logged in or not a tenant (landlord, property_manager, or no account yet),
  // send them to sign-up to create an account and apply
  const signUpHref = `/${subdomain}/sign-up?fromProperty=true&propertySlug=${encodeURIComponent(propertySlug)}`;

  return (
    <Link
      href={signUpHref}
      className={buttonClass}
    >
      Apply Now
    </Link>
  );
}
