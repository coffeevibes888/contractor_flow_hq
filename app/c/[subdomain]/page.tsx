import { redirect } from 'next/navigation';

/**
 * Legacy contractor subdomain route - redirects to unified /[subdomain] route
 * This page exists to handle old /c/[subdomain] URLs and redirect them permanently
 */
export default async function ContractorSubdomainRedirect({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  // Redirect to the unified subdomain route
  redirect(`/${subdomain}`);
}
