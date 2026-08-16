"use client";

import { useRouter } from "next/navigation";
import { ApplicationWizard } from "@/components/tenant/application-wizard";

interface Props {
  propertySlug: string;
  propertyName: string;
}

/**
 * Thin client wrapper around the shared ApplicationWizard that wires up
 * navigation handlers. All auth / onboarding logic is handled server-side
 * by the parent `page.tsx`, so this component trusts that it only renders
 * for authenticated users whose onboarding state has already been reconciled.
 */
export function ApplicationWizardClient({ propertySlug, propertyName }: Props) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <ApplicationWizard
        propertySlug={propertySlug}
        propertyName={propertyName}
        onComplete={() => router.push("/user/dashboard")}
        onCancel={() => router.back()}
      />
    </main>
  );
}
