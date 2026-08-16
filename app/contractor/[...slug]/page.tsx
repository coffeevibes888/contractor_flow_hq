import { redirect } from 'next/navigation';

// Catch-all redirect: /contractor/* → /contractor-dashboard/*
// Handles bookmarks and any hardcoded links to the old URL structure.
//
// On Next.js 16 `params` is async and must be awaited; reading it
// synchronously left `slug` undefined and collapsed every deep link to the
// bare dashboard root.
export default async function ContractorCatchAllRedirect({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const path = slug?.join('/') ?? '';
  redirect(`/contractor-dashboard/${path}`);
}
