import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { ApplicationWizardClient } from "./application-wizard-client";

/**
 * Subdomain-scoped property application page.
 *
 * Server-side guard:
 *   1. Unauthenticated → redirect to subdomain sign-up with Apply intent.
 *   2. Authenticated but `onboardingCompleted=false` → auto-upgrade to
 *      `role='tenant' + onboardingCompleted=true`. We can safely infer intent
 *      because they arrived at a property's Apply URL. This is the single
 *      choke-point that covers both credential signup and Google OAuth — no
 *      cookies / intent tokens required.
 *   3. Authenticated, onboarding-complete, non-tenant role → allow. An existing
 *      landlord or homeowner may legitimately apply for a rental; we don't
 *      mutate their role in that case.
 */
export default async function SubdomainApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ property?: string }>;
}) {
  const { subdomain } = await params;
  const { property: propertySlug = "" } = await searchParams;

  const session = await auth();

  if (!session?.user?.id) {
    const qs = new URLSearchParams({ fromProperty: "true" });
    if (propertySlug) qs.set("propertySlug", propertySlug);
    redirect(`/${subdomain}/sign-up?${qs.toString()}`);
  }

  // Auto-upgrade users who came here via Apply but haven't completed onboarding.
  // PROTECTED roles (superAdmin/admin) are never silently mutated.
  const PROTECTED = new Set(["superAdmin", "admin"]);
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, onboardingCompleted: true },
  });

  if (dbUser && !dbUser.onboardingCompleted && !PROTECTED.has(dbUser.role)) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: "tenant",
        onboardingCompleted: true,
      },
    });
  }

  // Look up property name server-side so the wizard header is correct on first paint.
  let propertyName = propertySlug;
  if (propertySlug) {
    const product = await prisma.product.findFirst({
      where: { slug: propertySlug },
      select: { name: true },
    });
    if (product?.name) propertyName = product.name;
  }

  return (
    <ApplicationWizardClient
      propertySlug={propertySlug}
      propertyName={propertyName}
    />
  );
}
