import type { Metadata } from 'next';
import Script from 'next/script';
import '@/assets/styles/globals.css';
import 'shepherd.js/dist/css/shepherd.css';
import { APP_DESCRIPTION, APP_NAME, SERVER_URL } from '@/lib/constants';
import { Toaster } from '@/components/ui/toaster';
import PageViewTracker from '@/components/analytics/page-view-tracker';
import SessionProviderWrapper from '@/components/session-provider-wrapper';
import { ThemeProvider } from 'next-themes';
import { TeamChatWidgetWrapper } from '@/components/team/team-chat-widget-wrapper';
import PrivacyConsentBanner from '@/components/privacy/privacy-consent-banner';
import { Suspense } from 'react';
import { TrialStatusWrapper } from '@/components/subscription/trial-status-wrapper';
// import LiveChatWidget from '@/components/shared/live-chat-widget';

let resolvedMetadataBase: URL;
try {
  resolvedMetadataBase = new URL(SERVER_URL);
} catch {
  resolvedMetadataBase = new URL('https://www.propertyflowhq.com');
}

export const metadata: Metadata = {
  title: {
    template: `%s | Property Flow HQ`,
    default: APP_NAME,
  },
  description: APP_DESCRIPTION,
  metadataBase: resolvedMetadataBase,
  keywords: [
    'property management software small landlord',
    'landlord software cheap',
    'online rent collection free',
    'automated rent collection software',
    'property management software under $20',
    'tenant portal software landlord',
    'lease management software landlord',
    'maintenance request tracking software',
    'landlord software with contractor management',
    'property management software no per unit fee',
    'property management software',
    'rent collection',
    'landlord software',
    'tenant portal',
    'maintenance tracking',
    'lease management',
    'rental property management',
    'online rent payment',
    'landlord tools',
    'contractor management software',
    'free lease builder',
    'automated late fees',
    'property management no per unit pricing',
    'small landlord software',
    'self managing landlord',
  ],
  authors: [{ name: 'Property Flow HQ' }],
  creator: 'Property Flow HQ',
  publisher: 'Property Flow HQ',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: resolvedMetadataBase.toString(),
    siteName: APP_NAME,
    title: 'Property Flow HQ — Affordable Property Management Software for Small Landlords',
    description: 'Automated rent collection, free lease builder, tenant portal, maintenance tracking, and contractor management. Starting at $39/month. No per-unit fees.',
    images: [
      {
        url: `${resolvedMetadataBase.toString()}images/propertyflowhqOG.png`,
        width: 1200,
        height: 630,
        alt: 'Property Flow HQ - Affordable Property Management Software for Small Landlords',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Property Flow HQ — Property Management Software Starting at $39/mo',
    description: 'Automated rent collection, free lease builder, tenant portal, maintenance tracking & contractor management. No per-unit fees.',
    images: [`${resolvedMetadataBase.toString()}images/propertyflowhqOG.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        {/* Microsoft Clarity — free session replay + heatmaps. lazyOnload
            keeps it off the critical path. Replace the project ID below
            with your own from clarity.microsoft.com (free, no cap). */}
        <Script id="ms-clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 'REPLACE_WITH_CLARITY_ID'}");`}
        </Script>

        {/* Google Analytics — lazyOnload moves the GTag script off the
            critical path so it doesn't block initial paint. */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-98GMCN3RXZ"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-98GMCN3RXZ');
          `}
        </Script>

        {/* Meta Pixel — lazyOnload defers the 145 KiB script until after the
            page is interactive, removing it from the critical path while
            still capturing PageView once the script eventually loads.
            autoConfig:false disables the pixel's automatic event detection
            (Lead on form submit, ViewContent on page, etc.) — without this
            the pixel's submit handler preventDefaults every <form> on the
            site, posts a hidden tracking form to www.facebook.com/tr, and
            only re-submits the real form after the tracking succeeds. If the
            tracking POST gets CSP-blocked the user's real submission is
            lost — which broke /sign-up until we added Facebook to the CSP
            form-action allowlist. We still fire PageView manually below. */}
        <Script id="meta-pixel" strategy="lazyOnload">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('set', 'autoConfig', false, '964798809289904');
            fbq('init', '964798809289904');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=964798809289904&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        {/* Reddit Pixel */}
        {process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID && (
          <Script id="reddit-pixel" strategy="lazyOnload">
            {`
              !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
              rdt('init','${process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID}');
              rdt('track','PageVisit');
            `}
          </Script>
        )}
      </head>
      <body className='bg-white text-black font-semibold flex flex-col min-h-screen overflow-x-hidden'>
        <SessionProviderWrapper>
          <ThemeProvider attribute='class' defaultTheme='light' enableSystem={false} disableTransitionOnChange>
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>

            <TrialStatusWrapper />
            {children}
            <Toaster />
            {/* Team Chat Widget - Available for Pro+ team members and tenants */}
            {/* <TeamChatWidgetWrapper /> */}
            <PrivacyConsentBanner />
            {/* <LiveChatWidget /> */}
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
