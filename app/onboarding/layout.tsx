import type { Metadata } from 'next';

/**
 * Onboarding pages collect personal info from authenticated users picking
 * a role. They have no SEO value and shouldn't show up in search.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
