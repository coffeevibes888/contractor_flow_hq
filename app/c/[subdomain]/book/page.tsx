import { redirect } from 'next/navigation';

/**
 * Legacy contractor booking route. The canonical booking flow now lives at
 * `/[subdomain]/schedule` (the unified subdomain namespace). This redirect
 * preserves any old `/c/[subdomain]/book` bookmarks instead of serving a
 * second, divergent booking widget.
 */
export default async function LegacyContractorBookRedirect({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  redirect(`/${subdomain}/schedule`);
}
