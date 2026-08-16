import type { Metadata } from 'next';

/**
 * Auth pages (sign-in, sign-up, password reset, etc.) should never appear
 * in search results — they have no SEO value and indexing them just wastes
 * crawl budget. We block at the metadata level here in addition to the
 * robots.txt rules so misconfiguration in one doesn't accidentally expose
 * them.
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

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className='flex-center min-h-screen w-full'>{children}</div>;
}
